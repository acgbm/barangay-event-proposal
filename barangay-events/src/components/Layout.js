import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = ({ role }) => {
  return (
    <div className="layout">
      <Sidebar role={role} />
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
