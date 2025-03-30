import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Verifying...");

  const db = getFirestore();

  useEffect(() => {
    const verifyEmail = async () => {
      const uid = searchParams.get("uid");
      if (!uid) {
        setStatus("Invalid verification link.");
        return;
      }

      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setStatus("User not found.");
          return;
        }

        // Update user's "verified" status
        await updateDoc(userRef, { verified: true });
        setStatus("Email verified successfully!");

        Swal.fire({
          icon: "success",
          title: "Verification Successful",
          text: "Your email has been verified. You can now log in.",
        });

      } catch (error) {
        setStatus("Verification failed.");
        console.error("Verification error:", error);

        Swal.fire({
          icon: "error",
          title: "Verification Failed",
          text: "An error occurred. Please try again.",
        });
      }
    };

    verifyEmail();
  }, [searchParams, db]);

  return (
    <div className="verify-email-container">
      <h2>{status}</h2>
    </div>
  );
};

export default VerifyEmail;
