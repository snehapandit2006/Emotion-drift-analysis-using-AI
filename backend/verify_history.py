import sys
import os
import unittest
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, engine, Base
from db.models import User, SentiaConversation, SentiaMessage

class TestSentiaHistory(unittest.TestCase):
    def setUp(self):
        # Create a test user if not exists
        self.db = SessionLocal()
        self.user = self.db.query(User).filter(User.email == "test@sentia.ai").first()
        if not self.user:
            self.user = User(email="test@sentia.ai", hashed_password="fake")
            self.db.add(self.user)
            self.db.commit()
            self.db.refresh(self.user)

    def test_conversation_persistence(self):
        print("Testing Sentia Conversation Persistence...")
        
        # 1. Create a conversation
        conv = SentiaConversation(user_id=self.user.id, title="Test Chat")
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        conv_id = conv.id
        print(f"Created Conversation ID: {conv_id}")

        # 2. Add messages
        msg1 = SentiaMessage(conversation_id=conv_id, role="user", content="Hello Sentia")
        msg2 = SentiaMessage(conversation_id=conv_id, role="bot", content="Hello User", emotion="joy", trace="LLM_OK")
        self.db.add_all([msg1, msg2])
        self.db.commit()

        # 3. Retrieve and verify
        retrieved_conv = self.db.query(SentiaConversation).filter(SentiaConversation.id == conv_id).first()
        self.assertIsNotNone(retrieved_conv)
        self.assertEqual(len(retrieved_conv.messages), 2)
        self.assertEqual(retrieved_conv.messages[0].content, "Hello Sentia")
        self.assertEqual(retrieved_conv.messages[1].trace, "LLM_OK")
        print("History Retrieval SUCCESS.")

    def tearDown(self):
        # Cleanup
        all_convs = self.db.query(SentiaConversation).filter(SentiaConversation.user_id == self.user.id).all()
        for conv in all_convs:
            self.db.delete(conv) # Cascades to messages
        self.db.commit()
        self.db.close()

if __name__ == "__main__":
    unittest.main()
