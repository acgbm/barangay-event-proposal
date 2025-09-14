import React, { useEffect, useState } from 'react';
import './Header.css';


function Header() {
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = days[now.getDay()];
      const month = months[now.getMonth()];
      const date = now.getDate();
      const year = now.getFullYear();
      let hour = now.getHours();
      const minute = now.getMinutes().toString().padStart(2, '0');
      const second = now.getSeconds().toString().padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12;
      const time = `${hour}:${minute}:${second} ${ampm}`;
      setDateTime(`${day}, ${month} ${date}, ${year}, ${time}`);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header-pro layout-header">
      <div className="header-pro-right">
        <svg className="header-pro-calendar" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="4" fill="#f5f6fa" stroke="#3a3a3a" strokeWidth="1.2"/><path d="M16 3v4M8 3v4" stroke="#3a3a3a" strokeWidth="1.2" strokeLinecap="round"/><rect x="7" y="11" width="2" height="2" rx=".7" fill="#3a3a3a"/><rect x="11" y="11" width="2" height="2" rx=".7" fill="#3a3a3a"/><rect x="15" y="11" width="2" height="2" rx=".7" fill="#3a3a3a"/></svg>
        <span className="header-pro-date">{dateTime}</span>
      </div>
    </header>
  );
}

export default Header;
