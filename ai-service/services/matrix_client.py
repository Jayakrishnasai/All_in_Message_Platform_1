"""
Matrix Client Service
=====================
HTTP client for interacting with Matrix Synapse REST APIs.
"""

import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

logger = structlog.get_logger()


class MatrixClient:
    """Client for Matrix Synapse REST API interactions."""
    
    def __init__(self, homeserver_url: str, access_token: str):
        """
        Initialize Matrix client.
        
        Args:
            homeserver_url: Base URL of the Matrix homeserver
            access_token: Access token for authentication
        """
        self.homeserver_url = homeserver_url.rstrip("/")
        self.access_token = access_token
        self.client = httpx.AsyncClient(
            base_url=self.homeserver_url,
            timeout=30.0,
            headers={"Authorization": f"Bearer {access_token}"} if access_token else {}
        )
        
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get_room_messages(
        self,
        room_id: str,
        limit: int = 100,
        from_token: Optional[str] = None,
        direction: str = "b"  # "b" for backwards, "f" for forwards
    ) -> List[Dict[str, Any]]:
        """
        Fetch messages from a Matrix room.
        
        Args:
            room_id: The room ID to fetch messages from
            limit: Maximum number of messages to return
            from_token: Pagination token
            direction: Direction to paginate ("b" or "f")
            
        Returns:
            List of message events
        """
        params = {
            "limit": min(limit, 1000),
            "dir": direction
        }
        if from_token:
            params["from"] = from_token
            
        url = f"/_matrix/client/r0/rooms/{room_id}/messages"
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            messages = []
            for event in data.get("chunk", []):
                if event.get("type") == "m.room.message":
                    content = event.get("content", {})
                    messages.append({
                        "id": event.get("event_id"),
                        "sender": event.get("sender"),
                        "content": content.get("body", ""),
                        "msgtype": content.get("msgtype"),
                        "timestamp": datetime.fromtimestamp(
                            event.get("origin_server_ts", 0) / 1000
                        ).isoformat(),
                        "room_id": room_id
                    })
            
            logger.info("Fetched messages", room_id=room_id, count=len(messages))
            return messages
            
        except httpx.HTTPStatusError as e:
            logger.error("Failed to fetch messages", room_id=room_id, status=e.response.status_code)
            raise
        except Exception as e:
            logger.error("Error fetching messages", room_id=room_id, error=str(e))
            raise
    
    async def get_joined_rooms(self) -> List[Dict[str, Any]]:
        """
        Get list of rooms the authenticated user has joined.
        
        Returns:
            List of room objects with id and name
        """
        url = "/_matrix/client/r0/joined_rooms"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            rooms = []
            for room_id in data.get("joined_rooms", []):
                room_info = await self._get_room_info(room_id)
                rooms.append({
                    "id": room_id,
                    "name": room_info.get("name", room_id),
                    "member_count": room_info.get("member_count", 0),
                    "topic": room_info.get("topic", "")
                })
            
            return rooms
            
        except Exception as e:
            logger.error("Error fetching joined rooms", error=str(e))
            raise
    
    async def _get_room_info(self, room_id: str) -> Dict[str, Any]:
        """Get room state and extract useful information."""
        try:
            # Get room name
            name_url = f"/_matrix/client/r0/rooms/{room_id}/state/m.room.name"
            name_response = await self.client.get(name_url)
            name = ""
            if name_response.status_code == 200:
                name = name_response.json().get("name", "")
            
            # Get room topic
            topic_url = f"/_matrix/client/r0/rooms/{room_id}/state/m.room.topic"
            topic_response = await self.client.get(topic_url)
            topic = ""
            if topic_response.status_code == 200:
                topic = topic_response.json().get("topic", "")
            
            # Get member count
            members_url = f"/_matrix/client/r0/rooms/{room_id}/joined_members"
            members_response = await self.client.get(members_url)
            member_count = 0
            if members_response.status_code == 200:
                member_count = len(members_response.json().get("joined", {}))
            
            return {
                "name": name,
                "topic": topic,
                "member_count": member_count
            }
            
        except Exception as e:
            logger.warning("Failed to get room info", room_id=room_id, error=str(e))
            return {}
    
    async def get_room_members(self, room_id: str) -> List[Dict[str, Any]]:
        """Get members of a room."""
        url = f"/_matrix/client/r0/rooms/{room_id}/joined_members"
        
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            members = []
            for user_id, info in data.get("joined", {}).items():
                members.append({
                    "user_id": user_id,
                    "display_name": info.get("display_name", user_id),
                    "avatar_url": info.get("avatar_url")
                })
            
            return members
            
        except Exception as e:
            logger.error("Error fetching room members", room_id=room_id, error=str(e))
            raise
    
    async def sync(
        self,
        timeout: int = 30000,
        since: Optional[str] = None,
        filter_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform a Matrix sync to get latest updates.
        
        Args:
            timeout: Long-polling timeout in milliseconds
            since: Sync token from previous sync
            filter_id: Optional filter ID
            
        Returns:
            Sync response with rooms, events, etc.
        """
        params = {"timeout": timeout}
        if since:
            params["since"] = since
        if filter_id:
            params["filter"] = filter_id
            
        url = "/_matrix/client/r0/sync"
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error("Sync failed", error=str(e))
            raise
    
    async def get_messages_for_date_range(
        self,
        room_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Fetch all messages within a date range.
        
        Args:
            room_id: Room to fetch from
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            List of messages within the range
        """
        all_messages = []
        from_token = None
        
        while True:
            messages = await self.get_room_messages(
                room_id=room_id,
                limit=1000,
                from_token=from_token
            )
            
            if not messages:
                break
            
            for msg in messages:
                msg_time = datetime.fromisoformat(msg["timestamp"])
                if start_date <= msg_time <= end_date:
                    all_messages.append(msg)
                elif msg_time < start_date:
                    # We've gone past our date range
                    return all_messages
            
            from_token = msg.get("id")  # Normally use 'end' token from response
            
            if len(messages) < 1000:
                break
        
        return all_messages
