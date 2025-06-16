import React, { useState } from "react";
import { db, auth } from "../../firebaseConfig"; // Firebase Firestore & Auth
import { supabase } from "../../firebaseConfig"; // Supabase Storage
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./StaffProposal.css"; // Ensure this file is styled

const StaffProposal = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState(""); // Added note field
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Character limits
  const DESCRIPTION_LIMIT = 120;
  const NOTE_LIMIT = 120;

  // Prevent selecting past dates
  const minDate = new Date().toISOString().split("T")[0];

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

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");    try {
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
        date,
        note: note || "", // Save the note
        fileURL,
        createdAt: serverTimestamp(),
        userId: user.uid, // 🔹 Store user ID
        userEmail: user.email, // 🔹 Store user email
        status: "Pending",
      });

      setMessage("✅ Proposal submitted successfully!");
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setNote(""); // Reset note field
      setFile(null);
    } catch (error) {
      console.error("❌ Error submitting proposal:", error.message);
      setMessage(`❌ Error submitting proposal: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="staff-proposal-container">
      <div className="staff-proposal-form-wrapper">
        <h2>Submit a Proposal</h2>
        {message && (
          <p className={`staff-proposal-message ${message.includes('❌') ? 'staff-proposal-error' : 'staff-proposal-success'}`}>
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="staff-proposal-form">
          <div className="staff-proposal-form-group">
            <label className="staff-proposal-label">Event Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="staff-proposal-input"
            />
          </div>

          <div className="staff-proposal-form-group">
            <label className="staff-proposal-label">Description:</label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              required
              maxLength={DESCRIPTION_LIMIT}
              className="staff-proposal-textarea"
            ></textarea>
            <div className={`staff-proposal-char-count ${
              description.length >= DESCRIPTION_LIMIT ? 'at-limit' :
              description.length >= DESCRIPTION_LIMIT * 0.9 ? 'near-limit' : ''
            }`}>
              {description.length}/{DESCRIPTION_LIMIT} characters
            </div>
          </div>

          <div className="staff-proposal-form-group">
            <label className="staff-proposal-label">Location:</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="staff-proposal-input"
            />
          </div>

          <div className="staff-proposal-form-group">
            <label className="staff-proposal-label">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              required
              className="staff-proposal-input"
            />
          </div>

          <div className="staff-proposal-form-group">
            <label className="staff-proposal-label">Note:</label>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Additional comments or instructions (optional)"
              maxLength={NOTE_LIMIT}
              className="staff-proposal-textarea"
            ></textarea>
            <div className={`staff-proposal-char-count ${
              note.length >= NOTE_LIMIT ? 'at-limit' :
              note.length >= NOTE_LIMIT * 0.9 ? 'near-limit' : ''
            }`}>
              {note.length}/{NOTE_LIMIT} characters
            </div>
          </div>

          <div className="staff-proposal-form-group">
            <label className="staff-proposal-label">Attachment (Permits, Budget Plans, etc.):</label>
            <input 
              type="file" 
              onChange={handleFileChange}
              className="staff-proposal-file-input"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="staff-proposal-submit-btn"
          >
            {loading ? "Submitting..." : "Submit Proposal"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffProposal;
