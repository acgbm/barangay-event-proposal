import Swal from 'sweetalert2';
import React, { useState, useRef, useEffect } from "react";
import { db, auth } from "../../firebaseConfig"; // Firebase Firestore & Auth
import { supabase } from "../../firebaseConfig"; // Supabase Storage
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import "./StaffProposal.css"; // Ensure this file is styled

// Function to create notification for officials
const createNotificationForOfficials = async (proposalTitle) => {
  try {
    await addDoc(collection(db, "notifications"), {
      message: `New pending proposal: ${proposalTitle}`,
      type: "info",
      timestamp: serverTimestamp(),
      proposalTitle: proposalTitle,
      status: "Pending",
      targetRole: "official",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

const StaffProposal = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [note, setNote] = useState(""); // Added note field
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [disabledSlots, setDisabledSlots] = useState([]);

  // Predefined location options
  const predefinedLocations = [
    "Barangay Hall",
    "Barangay Clinic",
    "James L. Gordon School",
    "Banicain Court",
  ];
  // Fetch approved proposals to disable used date+time slots
  useEffect(() => {
    const fetchDisabledSlots = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "proposals"));
        const disabled = querySnapshot.docs
          .filter(doc => doc.data().status === "Approved" && doc.data().startDate && doc.data().finishDate && doc.data().startTime && doc.data().finishTime)
          .map(doc => ({ startDate: doc.data().startDate, finishDate: doc.data().finishDate, startTime: doc.data().startTime, finishTime: doc.data().finishTime }));
        setDisabledSlots(disabled);
      } catch (err) {
        setDisabledSlots([]);
      }
    };
    fetchDisabledSlots();
  }, []);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);

  // Character limits
  const DESCRIPTION_LIMIT = 80;
  const NOTE_LIMIT = 60;
  const TITLE_LIMIT = 40;
  const LOCATION_LIMIT = 40;

  // Prevent selecting past dates (force minDate to tomorrow if today is selectable due to timezone)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // Add 1 day to ensure the minimum date is always today or later in all timezones
  const minDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const minDate = minDateObj.toISOString().split("T")[0];

  // Handle File Selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle description change with character limit
  const handleDescriptionChange = (e) => {
    const input = e.target.value;
    if (input.length <= DESCRIPTION_LIMIT) {
      setDescription(input);
    }
  };

  // Handle note change with character limit
  const handleNoteChange = (e) => {
    const input = e.target.value;
    if (input.length <= NOTE_LIMIT) {
      setNote(input);
    }
  };

  // Handle Event Title change (letters and spaces only, limit length)
  const handleTitleChange = (e) => {
    let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    if (value.length > TITLE_LIMIT) value = value.slice(0, TITLE_LIMIT);
    setTitle(value);
  };

  // Handle Location change (letters, numbers, spaces only, limit length)
  const handleLocationChange = (e) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
    if (value.length > LOCATION_LIMIT) value = value.slice(0, LOCATION_LIMIT);
    setLocation(value);
  };

  // Handle Location selection from dropdown
  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
    setShowLocationDropdown(false);
  };

  // Handle Location input field focus
  const handleLocationFocus = () => {
    setShowLocationDropdown(true);
  };

  // Handle Location input field blur (close dropdown after a small delay)
  const handleLocationBlur = () => {
    setTimeout(() => {
      setShowLocationDropdown(false);
    }, 200);
  };

  // Filter locations based on input
  const filteredLocations = predefinedLocations.filter(loc =>
    loc.toLowerCase().includes(location.toLowerCase())
  );

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      // Get the current logged-in user
      const user = auth.currentUser;
      if (!user) {
        setMessage("❌ User is not authenticated.");
        return;
      }

      let fileURL = "";

      if (file) {
        // Upload file to Supabase Storage with upsert enabled
        const { data, error } = await supabase.storage
          .from("proposals") // Bucket name
          .upload(`staff/${file.name}`, file, {
            cacheControl: "3600",
            upsert: true, // 🔥 Allows overwriting files if they exist
          });

        if (error) {
          throw new Error(`Upload Error: ${error.message}`);
        }

        // Get the public URL of the uploaded file
        const { data: publicData } = supabase.storage
          .from("proposals")
          .getPublicUrl(`staff/${file.name}`);

        fileURL = publicData.publicUrl;
      }

      // Save proposal data in Firestore, including `userId`, `userEmail`, and `note`
      await addDoc(collection(db, "proposals"), {
        title,
        description,
        location,
        startDate,
        finishDate,
        startTime,
        finishTime,
        note: note || "", // Save the note
        fileURL,
        createdAt: serverTimestamp(),
        userId: user.uid, // 🔹 Store user ID
        userEmail: user.email, // 🔹 Store user email
        status: "Pending",
      });

      // Create notification for officials
      await createNotificationForOfficials(title);

  setMessage("");
      Swal.fire({
        icon: 'success',
        title: 'Submitted!',
        text: 'Your proposal has been submitted.',
        confirmButtonColor: '#1976d2',
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setStartDate("");
      setFinishDate("");
      setNote(""); // Reset note field
      setStartTime("");
      setFinishTime("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("❌ Error submitting proposal:", error.message);
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: error.message || 'An error occurred while submitting your proposal.',
          confirmButtonColor: '#e53935',
        });
        setMessage("");
    }
    setLoading(false);
  };

  return (
    <div className="modern-form-bg">
      <div className="modern-form-wrapper">
        <h2 className="modern-form-title">SUBMIT A REQUEST</h2>
  <form onSubmit={handleSubmit} className="modern-form">
          <div className="modern-form-row">
            <div className="modern-form-group">
              <label className="modern-form-label">Event Title</label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                required
                className="modern-form-input"
                maxLength={TITLE_LIMIT}
                placeholder="Event Title"
              />
            </div>
            <div className="modern-form-group">
              <label className="modern-form-label">Location</label>
              <div className="location-input-wrapper">
                <input
                  type="text"
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={handleLocationFocus}
                  onBlur={handleLocationBlur}
                  required
                  className="modern-form-input"
                  maxLength={LOCATION_LIMIT}
                  placeholder="Select or type location"
                  autoComplete="off"
                />
                {showLocationDropdown && filteredLocations.length > 0 && (
                  <ul className="location-dropdown">
                    {filteredLocations.map((loc, idx) => (
                      <li key={idx} className="location-option">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleLocationSelect(loc);
                          }}
                          className="location-option-btn"
                        >
                          {loc}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="modern-form-row">
            <div className="modern-form-group">
              <label className="modern-form-label">Allocation of Date - Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={minDate}
                required
                className="modern-form-input"
              />
            </div>
            <div className="modern-form-group">
              <label className="modern-form-label">Allocation of Date - Finish</label>
              <input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                min={startDate || minDate}
                required
                className="modern-form-input"
              />
              {startDate && finishDate && finishDate < startDate && (
                <div style={{color:'#e53935',fontSize:13,marginTop:4}}>Finish date must be on or after start date.</div>
              )}
            </div>
          </div>
          <div className="modern-form-row">
            <div className="modern-form-group">
              <label className="modern-form-label">Allocation of Time - Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="modern-form-input"
                step="1800" // 30 min steps
                list="available-start-times"
                disabled={!startDate}
              />
              <datalist id="available-start-times">
                {[
                  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
                  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
                  "16:00","16:30","17:00","17:30"
                ].map(t => <option key={t} value={t}>{t}</option>)}
              </datalist>
            </div>
            <div className="modern-form-group">
              <label className="modern-form-label">Allocation of Time - Finish</label>
              <input
                type="time"
                value={finishTime}
                onChange={(e) => setFinishTime(e.target.value)}
                required
                className="modern-form-input"
                step="1800" // 30 min steps
                list="available-finish-times"
                disabled={!startDate || !startTime}
              />
              <datalist id="available-finish-times">
                {[
                  "08:30","09:00","09:30","10:00","10:30","11:00","11:30",
                  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
                  "16:00","16:30","17:00","17:30","18:00","18:30"
                ].map(t => {
                  const isValidFinishTime = startTime && t > startTime;
                  return <option key={t} value={t} disabled={!isValidFinishTime}>{t}</option>;
                })}
              </datalist>
              {startDate && startTime && finishTime && finishTime <= startTime && (
                <div style={{color:'#e53935',fontSize:13,marginTop:4}}>Finish time must be after start time.</div>
              )}
              {startDate && finishDate && startTime && finishTime && disabledSlots.some(slot => {
                // Check if the proposed slot overlaps with any approved slot
                const proposedStart = new Date(`${startDate}T${startTime}`);
                const proposedEnd = new Date(`${finishDate}T${finishTime}`);
                const approvedStart = new Date(`${slot.startDate}T${slot.startTime}`);
                const approvedEnd = new Date(`${slot.finishDate}T${slot.finishTime}`);
                return proposedStart < approvedEnd && proposedEnd > approvedStart;
              }) && (
                <div style={{color:'#e53935',fontSize:13,marginTop:4}}>This time slot conflicts with an already approved event.</div>
              )}
            </div>
          </div>
          <div className="modern-form-group-full" style={{ position: 'relative' }}>
            <label className="modern-form-label">Description</label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              required
              maxLength={DESCRIPTION_LIMIT}
              className="modern-form-textarea"
              placeholder="Type your description..."
              style={{ paddingBottom: '28px' }}
            ></textarea>
            <div
              className={`staff-proposal-char-count ${
                description.length >= DESCRIPTION_LIMIT ? 'at-limit' :
                description.length >= DESCRIPTION_LIMIT * 0.9 ? 'near-limit' : ''
              }`}
              style={{
                position: 'absolute',
                right: '18px',
                bottom: '10px',
                background: 'rgba(255,255,255,0.85)',
                padding: '0 6px',
                borderRadius: '8px',
                fontSize: '12px',
                pointerEvents: 'none',
              }}
            >
              {description.length}/{DESCRIPTION_LIMIT} characters
            </div>
          </div>
          <div className="modern-form-group-full" style={{ position: 'relative' }}>
            <label className="modern-form-label">Note</label>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Additional comments or instructions (optional)"
              maxLength={NOTE_LIMIT}
              className="modern-form-textarea"
              style={{ paddingBottom: '28px' }}
            ></textarea>
            <div
              className={`staff-proposal-char-count ${
                note.length >= NOTE_LIMIT ? 'at-limit' :
                note.length >= NOTE_LIMIT * 0.9 ? 'near-limit' : ''
              }`}
              style={{
                position: 'absolute',
                right: '18px',
                bottom: '10px',
                background: 'rgba(255,255,255,0.85)',
                padding: '0 6px',
                borderRadius: '8px',
                fontSize: '12px',
                pointerEvents: 'none',
              }}
            >
              {note.length}/{NOTE_LIMIT} characters
            </div>
          </div>
          <div className="modern-form-group-full">
            <label className="modern-form-label">Attachments</label>
            <div 
              className="modern-form-file-drop" 
              tabIndex={0}
              onClick={e => {
                // Prevent click on remove button from triggering file dialog
                if (e.target.classList.contains('modern-form-file-remove')) return;
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ' ') && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('drag-over'); }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setFile(e.dataTransfer.files[0]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <input 
                type="file" 
                onChange={handleFileChange}
                className="modern-form-file-input"
                ref={fileInputRef}
                id="modern-attachment"
                style={{ display: 'none' }}
              />
              {file ? (
                <span>
                  <span className="modern-form-file-selected">{file.name}</span>
                  <button type="button" className="modern-form-file-remove" aria-label="Remove file" onClick={e => { e.preventDefault(); e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>&times;</button>
                </span>
              ) : (
                <span><span className="modern-form-file-label-accent">Add or drop your</span> file to here.</span>
              )}
            </div>
          </div>
          <div className="modern-form-info">Before submitting a proposal, please write all the details of your event.</div>
          <button 
            type="submit" 
            disabled={loading}
            className="modern-form-submit-btn"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffProposal;
