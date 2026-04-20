"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, MapPin } from "lucide-react";
import Image from "next/image";

interface PrintHeaderProps {
  showPreparedBy?: boolean;
  adminName?: string;
  adminEmail?: string;
}

export function PrintHeader({ 
  showPreparedBy = false,
  adminName,
  adminEmail 
}: PrintHeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    setCurrentDateTime(new Date().toLocaleString());
  }, []);

  if (showPreparedBy) {
    return (
      <footer className="print:block hidden mt-12 pt-6 border-t-2 border-gray-300">
        <div className="text-sm text-gray-700">
          <div className="font-semibold mb-2">Prepared By:</div>
          <div>Name: {adminName || "Administrator"}</div>
          <div>Email: {adminEmail || "N/A"}</div>
          <div>Printed On: {currentDateTime}</div>
        </div>

        <div className="text-xs text-gray-500 text-center mt-8 pt-6 border-t border-gray-300">
          This document contains confidential client and case information.
          Unauthorized distribution is prohibited.
        </div>
      </footer>
    );
  }

  return (
    <header className="print:block hidden mb-8 p-6 border-b-2 border-gray-300">
      <div className="flex items-center gap-4">
        <Image src="/logo.jpg" alt="Logo" width={80} height={80} className="rounded-md" />
        <div>
          <h1 className="text-3xl font-bold">Delgado Law Office</h1>
          <div className="mt-2 text-sm text-gray-700">
            <div className="flex gap-2"><MapPin className="w-4" /> 4th Flr. Lizel Bldg., 269 National Rd. Muntinlupa City</div>
            <div className="flex gap-2 mt-1"><Phone className="w-4" /> +63 908 898 9503</div>
            <div className="flex gap-2 mt-1"><Mail className="w-4" /> admindelgadolaw@delgadooffices.com</div>
          </div>
        </div>
      </div>
      <hr className="mt-4" />
    </header>
  );
}
