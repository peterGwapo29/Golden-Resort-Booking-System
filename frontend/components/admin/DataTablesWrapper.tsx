"use client";

import React, { useEffect, useState } from "react";
import DataTable from "datatables.net-react";
import DT from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.min.css";

// Register DataTables plugin with React wrapper
(DataTable as any)["use"](DT);

interface DataTablesWrapperProps {
  data: any[];
  columns: any[];
  slots?: Record<string, any>;
  options?: Record<string, any>;
  className?: string;
}

export default function DataTablesWrapper({
  data,
  columns,
  slots,
  options,
  className = "",
}: DataTablesWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="py-16 text-center text-sm text-stone-500 font-sans">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Loading table data...</p>
      </div>
    );
  }

  const defaultOptions = {
    paging: true,
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100],
    searching: true,
    ordering: true,
    info: true,
    responsive: true,
    language: {
      search: "_INPUT_",
      searchPlaceholder: "Search records...",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ records",
      infoEmpty: "Showing 0 to 0 of 0 records",
      infoFiltered: "(filtered from _MAX_ total)",
      paginate: {
        first: "«",
        previous: "‹",
        next: "›",
        last: "»",
      },
    },
    ...options,
  };

  return (
    <div className={`golden-datatable-wrapper overflow-x-auto ${className}`}>
      <DataTable
        data={data}
        columns={columns}
        slots={slots}
        options={defaultOptions}
        className="display w-full text-left text-sm"
      />
    </div>
  );
}
