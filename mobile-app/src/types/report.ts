import { IncidentCategory, ReportStatus } from './incident';
import { Pagination } from './common';

export interface ReportCreatePayload {
  category: IncidentCategory;
  latitude: number;
  longitude: number;
  comment?: string | null;
  photo?: {
    uri: string;
    name?: string;
    type?: string;
  } | null;
}

export interface ReportConfirmation {
  success: boolean;
  message: string;
  report_id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  location: {
    latitude: number;
    longitude: number;
    address_reference: string;
  };
  created_at: string;
  status: ReportStatus;
  status_label: string;
  status_message: string;
  photo_url?: string | null;
}

export interface ReportConfirmationResponse {
  confirmation: ReportConfirmation;
}

export interface MyReportItem {
  id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  color: string;
  photo_url?: string | null;
  location: {
    latitude: number;
    longitude: number;
    address_reference: string;
  };
  created_at: string;
  current_status: ReportStatus;
  current_status_label: string;
}

export interface MyReportsResponse {
  items: MyReportItem[];
  pagination: Pagination;
}

export interface TimelineNodeItem {
  step_order: number;
  status: ReportStatus;
  title: string;
  description: string;
  admin_comment?: string | null;
  timestamp: string;
}

export interface MyReportDetail {
  id: string;
  report_number: string;
  category: IncidentCategory;
  category_label: string;
  color: string;
  photo_url?: string | null;
  comment?: string | null;
  location: {
    latitude: number;
    longitude: number;
    address_reference: string;
    display_text: string;
  };
  current_status: ReportStatus;
  current_status_label: string;
  timeline: TimelineNodeItem[];
}
