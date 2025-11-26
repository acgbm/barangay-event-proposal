
import { useEffect, useState, useRef } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./OfficialEvents.css";

function getTodayStr() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}



const Events = () => {
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const calendarRef = useRef(null);
  const todayStr = getTodayStr();

  useEffect(() => {
    const fetchApprovedProposals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "proposals"));
        const approvedEvents = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((proposal) => proposal.status === "Approved")
          .map((event) => ({
            id: event.id,
            title: event.title,
            startDate: event.startDate,
            finishDate: event.finishDate,
            startTime: event.startTime,
            finishTime: event.finishTime,
            location: event.location,
            description: event.description,
            // For FullCalendar: create start and end dates with times
            start: event.startDate,
            end: event.finishDate,
          }));
        setEvents(approvedEvents);
        // 3 nearest upcoming events (today or future)
        const upcomingList = approvedEvents
          .filter(ev => ev.startDate >= todayStr)
          .sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.startTime || "").localeCompare(b.startTime || ""))
          .slice(0, 3);
        setUpcoming(upcomingList);
      } catch (error) {
        console.error("Error fetching approved proposals:", error.message);
      }
    };
    fetchApprovedProposals();
  }, []);

  // Month/year navigation
  const handlePrevMonth = () => {
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };
  const handleNextMonth = () => {
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };
  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setFullYear(newYear);
      return d;
    });
  };

  // Sync FullCalendar when calendarDate changes
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(calendarDate);
    }
  }, [calendarDate]);

  const handleEventClick = (eventInfo) => {
    const eventDetails = events.find((event) => event.id === eventInfo.event.id);
    if (eventDetails) {
      setSelectedEvent(eventDetails);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  // Month/year display
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    yearOptions.push(y);
  }

  return (
    <div className="events-pro-container">
      <div className="events-pro-calendar-area">
        <div className="events-pro-toolbar">
          <button className="events-pro-nav-btn" onClick={handlePrevMonth} aria-label="Previous Month">&#8592;</button>
          <span className="events-pro-month-label">{monthNames[currentMonth]}</span>
          <select className="events-pro-year-select" value={currentYear} onChange={handleYearChange} aria-label="Select Year">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="events-pro-nav-btn" onClick={handleNextMonth} aria-label="Next Month">&#8594;</button>
        </div>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={events}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
      <aside className="events-pro-upcoming-card">
        <div className="events-pro-upcoming-title">Upcoming Events</div>
        <ul className="events-pro-upcoming-list">
          {upcoming.length === 0 && <li className="events-pro-upcoming-none">No upcoming events</li>}
          {upcoming.map((ev, idx) => (
            <li className="events-pro-upcoming-item" key={ev.id}>
              <div className="events-pro-upcoming-main">
                <div className="events-pro-upcoming-name">{ev.title}</div>
                <div className="events-pro-upcoming-date">{formatDate(ev.startDate)} - {formatDate(ev.finishDate)}</div>
                <div className="events-pro-upcoming-time">{ev.startTime || "-"} - {ev.finishTime || "-"}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Modal for Viewing Event Details */}
      {showModal && selectedEvent && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Event Details</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-detail-row full-width">
                <strong>Event Title:</strong>
                <span>{selectedEvent.title}</span>
              </div>
              <div className="modal-detail-row full-width">
                <strong>Description:</strong>
                <span>{selectedEvent.description || "No description provided"}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Location:</strong>
                <span>{selectedEvent.location || "-"}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Start Date:</strong>
                <span>{formatDate(selectedEvent.startDate)}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Finish Date:</strong>
                <span>{formatDate(selectedEvent.finishDate)}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Start Time:</strong>
                <span>{selectedEvent.startTime || "-"}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Finish Time:</strong>
                <span>{selectedEvent.finishTime || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
