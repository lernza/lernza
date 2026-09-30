import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import QuestView from "./components/QuestView";
import CertificateView from "./components/CertificateView";

export function pageToPath(page: string, params?: Record<string, string>): string {
  switch (page) {
    case "dashboard":
      return "/dashboard";
    case "quest":
      return params?.id ? `/quest/${params.id}` : "/quest";
    case "certificate":
      return params?.id ? `/certificate/${params.id}` : "/certificate";
    default:
      return `/${page}`;
  }
}

function MainApp() {
  const navigate = useNavigate();

  const handleSelectQuest = (questId: string) => {
    navigate(pageToPath("quest", { id: questId }));
  };

  const handleSelectCertificate = (tokenId: string) => {
    navigate(pageToPath("certificate", { id: tokenId }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        <Route path="/dashboard" element={<Dashboard onSelectQuest={handleSelectQuest} onSelectCertificate={handleSelectCertificate} />} />
        <Route path="/quest/:id" element={<QuestView />} />
        <Route path="/certificate/:id" element={<CertificateView />} />
        <Route path="/" element={<Dashboard onSelectQuest={handleSelectQuest} onSelectCertificate={handleSelectCertificate} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
