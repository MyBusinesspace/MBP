import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuickTasksPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to calendar page since Quick Tasks are now integrated there
    navigate('/calendar');
  }, [navigate]);

  return null;
}