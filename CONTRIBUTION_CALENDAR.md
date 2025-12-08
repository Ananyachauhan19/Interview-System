# Dynamic Contribution Calendar

The contribution calendar now displays **real student activity data** based on actual system interactions.

## Activity Types Tracked

### 1. **Sessions Scheduled** 
When both interviewer and student confirm a final time slot for an interview:
- Tracked when `Pair.finalConfirmedTime` is set
- Counts as 1 activity on that date

### 2. **Course Completions**
When a student completes a learning topic:
- Tracked when `Progress.completed = true` and `completedAt` is set
- Counts as 1 activity per completed topic

## Features

### Year Filtering
- Dropdown selector to view activity for different years
- Shows years from when the user profile was created to current year
- Automatically loads data for selected year

### Statistics Display
- **Total Sessions**: Number of interview sessions scheduled
- **Total Completions**: Number of learning topics completed
- Shows summary badges at the top of the calendar

### Visual Intensity
Activity levels are color-coded:
- **Gray** (bg-slate-100): No activity (0)
- **Light Blue** (bg-blue-200): Low activity (1)
- **Medium Blue** (bg-blue-400): Medium activity (2-3)
- **Dark Blue** (bg-blue-600): High activity (4-6)
- **Darkest Blue** (bg-blue-700): Very high activity (7+)

## API Endpoints

### GET `/api/auth/activity?year=2025`
Returns student activity data for the specified year.

**Query Parameters:**
- `year` (optional): Year to fetch data for. Defaults to current year.

**Response:**
```json
{
  "activityByDate": {
    "2025-01-15": 3,
    "2025-01-16": 1,
    "2025-02-10": 5
  },
  "year": 2025,
  "availableYears": [2024, 2025],
  "stats": {
    "totalSessions": 12,
    "totalCompletions": 45,
    "totalActivities": 57
  }
}
```

## Database Queries

### Sessions Aggregation
```javascript
await Pair.aggregate([
  {
    $match: {
      $or: [
        { interviewer: userId },
        { interviewee: userId }
      ],
      finalConfirmedTime: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$finalConfirmedTime' } },
      count: { $sum: 1 }
    }
  }
]);
```

### Completions Aggregation
```javascript
await Progress.aggregate([
  {
    $match: {
      studentId: userId,
      completed: true,
      completedAt: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
      count: { $sum: 1 }
    }
  }
]);
```

## Component Usage

### Student Profile (with year filter)
```jsx
<ContributionCalendar 
  activityByDate={activity} 
  title="Contribution Calendar"
  year={selectedYear}
  availableYears={availableYears}
  onYearChange={handleYearChange}
  showYearFilter={true}
  stats={activityStats}
/>
```

### Admin View (without year filter)
```jsx
<ContributionCalendar 
  activityByDate={activity} 
  title="Student Activity"
  year={2025}
/>
```

## Files Modified

### Backend
- `backend/src/controllers/activityController.js` - New controller with `getStudentActivity()`
- `backend/src/routes/auth.js` - Added `GET /auth/activity` endpoint

### Frontend
- `frontend/src/utils/api.js` - Added `getStudentActivity(year)` method
- `frontend/src/components/ContributionCalendar.jsx` - Added year filter and stats display
- `frontend/src/student/StudentProfile.jsx` - Integrated real activity data with year selection

## Data Flow

1. **User selects year** from dropdown (or defaults to current year)
2. **Frontend calls** `api.getStudentActivity(year)`
3. **Backend aggregates**:
   - Sessions from `Pair` collection where `finalConfirmedTime` is set
   - Completions from `Progress` collection where `completed = true`
4. **Backend returns** activity map with dates as keys and counts as values
5. **Calendar renders** with color intensity based on activity counts
6. **Stats badges** show total sessions and completions

## Future Enhancements

Potential additional activity types to track:
- Feedback submissions
- Video watch time milestones
- Practice session completions
- Event participations
- Profile updates
