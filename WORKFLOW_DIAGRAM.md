# 🔄 Motia Workflow Visualization

Complete visual breakdown of the event-driven workflow architecture.

---

## 📊 High-Level Flow

```
┌──────────────┐
│   Student    │
│  Submits     │
│   Event      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│         Express Route Handler                │
│   POST /api/student/event                    │
│                                              │
│   ❌ NO business logic here!                │
│   ✅ ONLY emits event to Motia              │
└──────────────┬───────────────────────────────┘
               │
               │ motia.emit('STUDENT_EVENT', data)
               ▼
┌────────────────────────────────────────────────────────┐
│              MOTIA WORKFLOW ENGINE                     │
│   Workflow: StudentDropoutRiskWorkflow                 │
│   Trigger: STUDENT_EVENT                               │
│                                                        │
│   ┌──────────────────────────────────────────────┐   │
│   │  Step 1: validateStudentEvent                │   │
│   │  • Verify student exists                     │   │
│   │  • Validate event type                       │   │
│   │  • Validate event data                       │   │
│   └─────────────────┬────────────────────────────┘   │
│                     │                                  │
│   ┌─────────────────▼────────────────────────────┐   │
│   │  Step 2: storeEvent                          │   │
│   │  • Create EngagementEvent in MongoDB         │   │
│   │  • Timestamp the event                       │   │
│   └─────────────────┬────────────────────────────┘   │
│                     │                                  │
│   ┌─────────────────▼────────────────────────────┐   │
│   │  Step 3: analyzeEngagement                   │   │
│   │  • Get/create StudentProfile                 │   │
│   │  • Update statistics                         │   │
│   │  • Calculate averages                        │   │
│   └─────────────────┬────────────────────────────┘   │
│                     │                                  │
│   ┌─────────────────▼────────────────────────────┐   │
│   │  Step 4: detectDropoutRisk                   │   │
│   │  • Apply risk detection rules                │   │
│   │  • Update risk level                         │   │
│   │  • Generate risk reasons                     │   │
│   └─────────────────┬────────────────────────────┘   │
│                     │                                  │
│   ┌─────────────────▼────────────────────────────┐   │
│   │  Step 5: notifyStudent                       │   │
│   │  • Generate student notification             │   │
│   │  • Provide recommendations                   │   │
│   └─────────────────┬────────────────────────────┘   │
│                     │                                  │
│   ┌─────────────────▼────────────────────────────┐   │
│   │  Step 6: notifyMentor                        │   │
│   │  • Alert mentors if risk changed             │   │
│   │  • Include student details                   │   │
│   └──────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
               │
               │ Workflow Complete
               ▼
       ┌───────────────┐
       │   Response    │
       │   to Client   │
       └───────────────┘
```

---

## 🎯 Detailed Step Breakdown

### Step 1: validateStudentEvent

**Purpose**: Ensure data integrity before processing

```javascript
Input: { studentId, eventType, eventData }

Validation:
├── Check student exists in database
├── Verify student role is 'student'
├── Validate eventType is one of: attendance, assignment, performance
└── Validate eventData structure based on type:
    ├── attendance: status must be 'present' or 'absent'
    ├── assignment: submitted (boolean) + assignmentName (string)
    └── performance: score (0-100) + testName (string)

Output: { validated: true, student, eventType, eventData }

Error: Throws error if validation fails (workflow stops)
```

**Why it matters**: Prevents invalid data from corrupting the system

---

### Step 2: storeEvent

**Purpose**: Persist the event for historical tracking

```javascript
Input: { student, eventType, eventData }

Process:
├── Create EngagementEvent document
├── Set studentId from student._id
├── Store eventType and eventData
├── Mark as unprocessed
└── Timestamp creation

Output: { ...input, event, eventId }

Database: EngagementEvent collection
```

**Why it matters**: Creates audit trail for all student activities

---

### Step 3: analyzeEngagement

**Purpose**: Update student profile with latest statistics

```javascript
Input: { student, eventType, eventData, event }

Process:
├── Find or create StudentProfile for student
├── Update statistics based on eventType:
│   ├── attendance:
│   │   ├── Increment totalAttendance
│   │   ├── If present: increment presentCount, reset consecutiveAbsences
│   │   └── If absent: increment absentCount, increment consecutiveAbsences
│   ├── assignment:
│   │   ├── If submitted: increment assignmentsSubmitted
│   │   └── If missed: increment assignmentsMissed
│   └── performance:
│       ├── Add score to performanceScores array
│       └── Recalculate averagePerformance
└── Save updated profile

Output: { ...input, profile }

Database: StudentProfile collection (upsert)
```

**Why it matters**: Maintains real-time engagement metrics

---

### Step 4: detectDropoutRisk

**Purpose**: Evaluate risk level based on engagement data

```javascript
Input: { student, profile }

Risk Rules:
├── Rule 1: 3+ consecutive absences → MEDIUM risk
├── Rule 2: 2+ missed assignments → HIGH risk
└── Rule 3: Average performance < 40% → HIGH risk

Process:
├── Initialize riskLevel = 'Low'
├── Initialize riskReasons = []
├── Apply each rule:
│   ├── If rule triggered:
│   │   ├── Update riskLevel (High > Medium > Low)
│   │   └── Add reason to riskReasons
│   └── Continue to next rule
├── Update profile.riskLevel
├── Update profile.riskReason
└── Detect if risk level changed

Output: { ...input, riskLevel, riskReasons, riskChanged, profile }

Database: StudentProfile collection (update)
```

**Why it matters**: Core intelligence of the system - identifies at-risk students

---

### Step 5: notifyStudent

**Purpose**: Inform student of their risk status

```javascript
Input: { student, riskLevel, riskReasons }

Process:
├── Check if riskLevel is Medium or High
├── If yes:
│   ├── Create notification object:
│   │   ├── Message: explain risk
│   │   └── Recommendations: based on riskReasons
│   └── (In production: send email/SMS)
└── If no: return null notification

Output: { ...input, studentNotification }

Future: Email/SMS integration
```

**Why it matters**: Empowers students with actionable feedback

---

### Step 6: notifyMentor

**Purpose**: Alert mentors to intervene for at-risk students

```javascript
Input: { student, riskLevel, riskReasons, riskChanged }

Process:
├── Check if (Medium or High) AND risk level changed
├── If yes:
│   ├── Find all mentors in database
│   ├── Create notification with student details
│   └── (In production: send email/SMS to mentors)
└── If no: return null notification

Output: { ...input, mentorNotification, mentorsNotified }

Future: Assign specific mentors to students
```

**Why it matters**: Enables timely intervention by educators

---

## 🔀 Event Types Deep Dive

### Attendance Event

```
User submits: { status: 'absent' }
                    ↓
        validateStudentEvent
                    ↓
            storeEvent
                    ↓
        analyzeEngagement
         ├── totalAttendance++
         ├── absentCount++
         └── consecutiveAbsences++
                    ↓
        detectDropoutRisk
         └── if consecutiveAbsences >= 3:
             riskLevel = 'Medium'
                    ↓
         notifyStudent
         (risk alert sent)
                    ↓
         notifyMentor
         (mentor alert sent)
```

### Assignment Event

```
User submits: { submitted: false, assignmentName: 'Homework 5' }
                    ↓
        validateStudentEvent
                    ↓
            storeEvent
                    ↓
        analyzeEngagement
         └── assignmentsMissed++
                    ↓
        detectDropoutRisk
         └── if assignmentsMissed >= 2:
             riskLevel = 'High'
                    ↓
         notifyStudent
         (urgent alert sent)
                    ↓
         notifyMentor
         (intervention needed)
```

### Performance Event

```
User submits: { score: 35, testName: 'Midterm' }
                    ↓
        validateStudentEvent
                    ↓
            storeEvent
                    ↓
        analyzeEngagement
         ├── performanceScores.push(35)
         └── averagePerformance = avg(scores)
                    ↓
        detectDropoutRisk
         └── if averagePerformance < 40:
             riskLevel = 'High'
                    ↓
         notifyStudent
         (study recommendations)
                    ↓
         notifyMentor
         (academic support needed)
```

---

## 💡 Why This Architecture?

### Traditional Approach (❌)
```
Controller → Business Logic → Database → Response
     ↓
  (Everything coupled, hard to scale)
```

### Event-Driven Approach (✅)
```
Controller → Emit Event → Workflow (6 steps) → Response
     ↓
  (Decoupled, scalable, maintainable)
```

### Benefits:

1. **Separation of Concerns**
   - Controllers only handle HTTP
   - Business logic in workflow steps
   - Easy to test individually

2. **Scalability**
   - Each step can be scaled independently
   - Easy to add caching/queuing

3. **Extensibility**
   - Add new steps without touching existing code
   - Example: Add "sendEmailNotification" step

4. **Observability**
   - Each step logs its execution
   - Easy to trace issues

5. **Reusability**
   - Steps can be used in other workflows
   - Example: Use "detectDropoutRisk" in batch jobs

---

## 🔧 Extending the Workflow

### Add Email Notifications

Create new step: `sendEmailNotification.step.js`

```javascript
export default async function sendEmailNotification({ input }) {
  const { student, riskLevel, studentNotification } = input;
  
  if (studentNotification) {
    await sendEmail({
      to: student.email,
      subject: `Risk Alert: ${riskLevel}`,
      body: studentNotification.message,
    });
  }
  
  return input;
}
```

Update workflow:
```javascript
steps: [
  'validateStudentEvent',
  'storeEvent',
  'analyzeEngagement',
  'detectDropoutRisk',
  'notifyStudent',
  'sendEmailNotification',  // NEW STEP
  'notifyMentor',
]
```

No other code changes needed! ✨

---

## 📈 Workflow Monitoring

Each step logs to console:

```
✅ [Motia Step] Event validated for student: John Doe
📝 [Motia Step] Event stored: attendance for John Doe
📊 [Motia Step] Engagement analyzed for John Doe
   Stats: { totalAttendance: 5, consecutiveAbsences: 3, ... }
🚨 [Motia Step] Risk detected: Medium for John Doe
   Reasons: 3 consecutive absences
📧 [Motia Step] Notification sent to student: John Doe
   Message: Your engagement level requires attention...
🚨 [Motia Step] Alert sent to 2 mentor(s)
   Student: John Doe | Risk: Medium
```

---

## 🎓 Learning Resources

To understand more about event-driven architecture:

1. **Motia Documentation**: Check Motia's official docs
2. **Event Sourcing**: Research this architectural pattern
3. **CQRS**: Command Query Responsibility Segregation
4. **Message Queues**: RabbitMQ, Kafka (for production scale)

---

**This workflow is the heart of the system. Every student action triggers this pipeline, ensuring real-time risk detection!** 🚀


