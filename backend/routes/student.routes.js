import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { triggerMotiaEvent } from '../config/motia.js';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import EngagementEvent from '../models/EngagementEvent.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /student/event - Submit engagement event (triggers Motia workflow)
router.post('/event', async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    const studentId = req.user._id;

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit engagement events',
      });
    }

    // 1️⃣ Save event in DB
    const engagementEvent = await EngagementEvent.create({
      studentId,
      eventType,
      eventData,
    });

    // 2️⃣ Trigger Motia workflow
    const motiaResult = await triggerMotiaEvent('STUDENT_EVENT', {
      studentId,
      eventType,
      eventData,
      eventId: engagementEvent._id,
    });

    res.json({
      success: true,
      message: 'Event submitted & Motia workflow triggered',
      data: {
        eventId: engagementEvent._id,
        motiaResult,
      },
    });
  } catch (error) {
    console.error('Event submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit event',
    });
  }
});

export default router;


