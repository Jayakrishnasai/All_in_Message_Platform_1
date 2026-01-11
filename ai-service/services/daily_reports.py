"""
Daily Reports Service
=====================
Generate daily summaries and reports from messages.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import Counter
import structlog

logger = structlog.get_logger()


class DailyReportService:
    """Service for generating daily message reports."""
    
    def __init__(self, matrix_client, summarizer):
        """
        Initialize the daily report service.
        
        Args:
            matrix_client: MatrixClient instance
            summarizer: SummarizerService instance
        """
        self.matrix_client = matrix_client
        self.summarizer = summarizer
        self.intent_parser = None  # Set later if needed
    
    def set_intent_parser(self, intent_parser):
        """Set the intent parser for intent distribution."""
        self.intent_parser = intent_parser
    
    async def generate_report(self, date: str = None) -> Dict[str, Any]:
        """
        Generate a daily report for all rooms.
        
        Args:
            date: Date string (YYYY-MM-DD), defaults to today
            
        Returns:
            Report dictionary
        """
        # Parse date
        if date:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        else:
            target_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        end_date = target_date + timedelta(days=1)
        
        logger.info("Generating daily report", date=date)
        
        report = {
            "date": target_date.strftime("%Y-%m-%d"),
            "generated_at": datetime.utcnow().isoformat(),
            "room_summaries": {},
            "total_messages": 0,
            "top_intents": {},
            "high_priority_count": 0,
            "participants": set()
        }
        
        try:
            # Get all rooms
            rooms = await self.matrix_client.get_joined_rooms()
            
            all_intents = []
            
            for room in rooms:
                room_id = room["id"]
                room_name = room.get("name", room_id)
                
                # Get messages for the date range
                messages = await self.matrix_client.get_messages_for_date_range(
                    room_id=room_id,
                    start_date=target_date,
                    end_date=end_date
                )
                
                if not messages:
                    continue
                
                # Generate room summary
                room_report = await self._generate_room_report(
                    room_id=room_id,
                    room_name=room_name,
                    messages=messages
                )
                
                report["room_summaries"][room_name] = room_report
                report["total_messages"] += len(messages)
                report["high_priority_count"] += room_report.get("high_priority_count", 0)
                
                # Collect participants
                for msg in messages:
                    report["participants"].add(msg.get("sender", "Unknown"))
                
                # Collect intents
                all_intents.extend(room_report.get("intents", []))
            
            # Calculate intent distribution
            if all_intents:
                intent_counts = Counter(all_intents)
                total = len(all_intents)
                report["top_intents"] = {
                    intent: {
                        "count": count,
                        "percentage": round(count / total * 100, 1)
                    }
                    for intent, count in intent_counts.most_common()
                }
            
            # Convert participants set to list
            report["participants"] = list(report["participants"])
            
            logger.info("Daily report generated", 
                       date=date, 
                       rooms=len(report["room_summaries"]),
                       total_messages=report["total_messages"])
            
            return report
            
        except Exception as e:
            logger.error("Failed to generate daily report", error=str(e))
            raise
    
    async def _generate_room_report(
        self,
        room_id: str,
        room_name: str,
        messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate report for a single room."""
        contents = [msg.get("content", "") for msg in messages]
        
        # Generate summary
        summary = self.summarizer.summarize(contents, max_length=200)
        
        # Get participants
        participants = list(set(msg.get("sender", "Unknown") for msg in messages))
        
        # Classify intents if parser available
        intents = []
        high_priority_count = 0
        
        if self.intent_parser:
            for content in contents:
                result = self.intent_parser.classify(content)
                intents.append(result["intent"])
                if result["intent"] == "urgent":
                    high_priority_count += 1
        
        return {
            "room_id": room_id,
            "message_count": len(messages),
            "summary": summary,
            "participants": participants,
            "participant_count": len(participants),
            "intents": intents,
            "high_priority_count": high_priority_count,
            "first_message_time": messages[0].get("timestamp") if messages else None,
            "last_message_time": messages[-1].get("timestamp") if messages else None
        }
    
    async def generate_weekly_summary(
        self,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a weekly summary from daily reports.
        
        Args:
            end_date: End date of the week (YYYY-MM-DD)
            
        Returns:
            Weekly summary dictionary
        """
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end = datetime.utcnow()
        
        start = end - timedelta(days=7)
        
        weekly_summary = {
            "period_start": start.strftime("%Y-%m-%d"),
            "period_end": end.strftime("%Y-%m-%d"),
            "daily_reports": [],
            "total_messages": 0,
            "total_rooms_active": set(),
            "intent_trends": Counter()
        }
        
        # Generate daily reports for the week
        current = start
        while current <= end:
            try:
                daily = await self.generate_report(current.strftime("%Y-%m-%d"))
                weekly_summary["daily_reports"].append(daily)
                weekly_summary["total_messages"] += daily["total_messages"]
                weekly_summary["total_rooms_active"].update(daily["room_summaries"].keys())
                
                for intent, data in daily.get("top_intents", {}).items():
                    weekly_summary["intent_trends"][intent] += data["count"]
                    
            except Exception as e:
                logger.warning("Failed to get daily report", date=current, error=str(e))
            
            current += timedelta(days=1)
        
        weekly_summary["total_rooms_active"] = list(weekly_summary["total_rooms_active"])
        weekly_summary["intent_trends"] = dict(weekly_summary["intent_trends"])
        
        return weekly_summary
