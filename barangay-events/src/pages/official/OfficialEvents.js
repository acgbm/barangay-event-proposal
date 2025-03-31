import { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Swal from "sweetalert2";
import "./OfficialEvents.css";

const Events = () => {
  const [events, setEvents] = useState([]);

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
            date: event.date,
            time: event.time,
            location: event.location,
            description: event.description,
          }));

        setEvents(approvedEvents);
      } catch (error) {
        console.error("Error fetching approved proposals:", error.message);
      }
    };

    fetchApprovedProposals();
  }, []);

  const handleEventClick = (eventInfo) => {
    const eventDetails = events.find((event) => event.id === eventInfo.event.id);
    if (eventDetails) {
      Swal.fire({
        title: eventDetails.title,
        html: `
          <p><strong>Date:</strong> ${eventDetails.date}</p>
          <p><strong>Location:</strong> ${eventDetails.location}</p>
          <p><strong>Description:</strong> ${eventDetails.description}</p>
        `,
        icon: "info",
        confirmButtonText: "Close",
      });
    }
  };

  return (
    <div className="events-wrapper">
      <h2 className="events-title">Event Calendar</h2>
      <div className="events-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "", // Removes week/day views
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
    </div>
  );
};

export default Events;
