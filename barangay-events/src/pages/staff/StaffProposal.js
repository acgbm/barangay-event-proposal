import React, { useState } from "react";
import { db } from "../../firebaseConfig"; // Firebase Firestore
import { supabase } from "../../firebaseConfig"; // Supabase Storage
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./StaffProposal.css"; // Ensure this file is styled

const StaffProposal = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Prevent selecting past dates
  const minDate = new Date().toISOString().split("T")[0];

  // Handle File Selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
  
    try {
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
  
      // Save proposal data in Firestore
      await addDoc(collection(db, "proposals"), {
        title,
        description,
        location,
        date,
        fileURL,
        createdAt: serverTimestamp(),
      });
  
      setMessage("✅ Proposal submitted successfully!");
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
      setFile(null);
    } catch (error) {
      console.error("❌ Error submitting proposal:", error.message);
      setMessage(`❌ Error submitting proposal: ${error.message}`);
    }
    setLoading(false);
  };
  

  return (
    <div className="proposal-container">
      <h2>Submit a Proposal</h2>
      {message && <p className="message">{message}</p>}
      <form onSubmit={handleSubmit}>
        <label>Event Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label>Description:</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>

        <label>Location:</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />

        <label>Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={minDate} // Prevent past dates
          required
        />

        <label>Attachment (Permits, Budget Plans, etc.):</label>
        <input type="file" onChange={handleFileChange} />

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Proposal"}
        </button>
      </form>
    </div>
  );
};

export default StaffProposal;
