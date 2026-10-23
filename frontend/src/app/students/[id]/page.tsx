"use client";

import React from "react";
import { useParams } from "next/navigation";
import { StudentDetails } from "@/components/students/student-details";

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  return <StudentDetails studentId={id} />;
}
