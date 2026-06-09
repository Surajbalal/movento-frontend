import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { SocketContext } from '../Context/SocketContext';

function UserLogout() {
  const navigate = useNavigate();
  const { reconnectSocket } = useContext(SocketContext);

  useEffect(() => {
    const logout = async () => {
      try {
        const response = await axiosInstance.get(`/auth/users/logOut`);
        if (response.status === 200) {
          localStorage.removeItem('token');
          reconnectSocket();
          navigate('/');
        }
      } catch (error) {
        console.error('Logout error:', error);
        // Even if the server call fails, clear local storage and redirect
        localStorage.removeItem('token');
        reconnectSocket();
        navigate('/');
      }
    };

    logout();
  }, [reconnectSocket, navigate]);

  return (
    <div>Logging out...</div>
  );
}

export default UserLogout;