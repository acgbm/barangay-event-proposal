# How to Add NotificationDashboard Route

## Quick Setup

Add this to your **App.js** file:

### 1. Import the component
```javascript
import NotificationDashboard from './pages/NotificationDashboard';
```

### 2. Add the route
In your `<Routes>` section, add:

```javascript
<Route path="/notifications" element={<NotificationDashboard />} />
```

### Complete Example

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NotificationDashboard from './pages/NotificationDashboard'; // ADD THIS
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import StaffDashboard from './pages/staff/StaffDashboard';
// ... other imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/notifications" element={<NotificationDashboard />} /> {/* ADD THIS */}
        <Route path="/staff/*" element={<StaffDashboard />} />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

## Access the Dashboard

After adding the route, you can access it at:

```
http://localhost:3000/notifications
```

Or add a link in your navigation:

```javascript
<Link to="/notifications">
  🔔 Notifications
</Link>
```

## What You'll See

The NotificationDashboard includes:

1. **Your Notifications Panel**
   - View all notifications
   - Mark as read
   - Delete notifications
   - See notification timestamps

2. **Scheduled Notifications Panel**
   - Manually trigger upcoming event reminders
   - See last run time
   - Get feedback on success/failure

3. **Information Panels**
   - How each notification type works
   - List of features
   - Instructions

## Testing Notifications

1. Start your app:
   ```bash
   npm start
   ```

2. Go to `http://localhost:3000/notifications`

3. Perform test actions:
   - Submit a proposal (triggers new pending notification)
   - Approve/decline proposals (triggers approval/decline notifications)
   - Click "Trigger Now" for upcoming event test

4. See notifications appear in real-time!

## Optional: Add NotificationCenter to Header

To show notifications in the header too:

```javascript
// In Header.js or Layout.js
import NotificationCenter from '../components/NotificationCenter';

// In your header JSX:
<header>
  <nav>
    <Link to="/">Home</Link>
    {/* ... other nav items */}
    <NotificationCenter /> {/* Adds bell icon with dropdown */}
  </nav>
</header>
```

---

That's it! The notification system is ready to use. 🎉
