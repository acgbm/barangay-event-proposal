import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig'; // Firebase Firestore
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'; // Add these imports
import { arrayUnion } from 'firebase/firestore'; // Import arrayUnion
import { supabase } from '../../firebaseConfig'; // Import Supabase
import "./ReviewProposal.css"; // Ensure this file is styled

const ReviewProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null); // To handle selected file
  const [isPopupOpen, setIsPopupOpen] = useState(false); // For popup control
  const [loading, setLoading] = useState(true);

  // Fetch proposals from Firestore
  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'proposals'));
        const fetchedProposals = [];
        querySnapshot.forEach((doc) => {
          fetchedProposals.push({ ...doc.data(), id: doc.id });
        });
        setProposals(fetchedProposals);
      } catch (error) {
        console.error('Error fetching proposals:', error.message);
      }
      setLoading(false);
    };
    fetchProposals();
  }, []);

  // Handle file popup
  const openFilePopup = (fileURL) => {
    setSelectedFile(fileURL);
    setIsPopupOpen(true);
  };

  const closeFilePopup = () => {
    setIsPopupOpen(false);
    setSelectedFile(null);
  };

  // Handle voting
  const handleVote = async (proposalId, voteType) => {
    try {
      const proposalRef = doc(db, 'proposals', proposalId);
      await updateDoc(proposalRef, {
        votes: arrayUnion(voteType), // Add vote to the proposal
      });
      console.log(`Proposal ${voteType}d successfully!`);
    } catch (error) {
      console.error('Error voting on proposal:', error.message);
    }
  };

  // Render proposals
  if (loading) {
    return <div>Loading proposals...</div>;
  }

  return (
    <div className="review-proposals-container">
      <h2>Review Proposals</h2>

      <div className="proposals-list">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="proposal-card">
            <h3><strong>Event Title:</strong> {proposal.title}</h3>
            <p><strong>Description:</strong> {proposal.description}</p>
            <p><strong>Location:</strong> {proposal.location}</p>
            <p><strong>Date:</strong> {proposal.date}</p>
            <button onClick={() => openFilePopup(proposal.fileURL)} className="file-button">View Attachment</button>

            {/* Add space between the attachment button and voting buttons */}
            <div className="voting-buttons">
              <button onClick={() => handleVote(proposal.id, 'approve')} className="approve-button">Approve</button>
              <button onClick={() => handleVote(proposal.id, 'reject')} className="reject-button">Reject</button>
            </div>
          </div>
        ))}
      </div>

      {/* Popup for the attachment */}
      {isPopupOpen && (
        <div className="file-popup">
          <div className="file-popup-content">
            <button className="close-popup" onClick={closeFilePopup}>X</button>
            <iframe src={selectedFile} width="100%" height="400px" title="Attachment"></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewProposals;
