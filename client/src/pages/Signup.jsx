import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth(); // Mock signup by logging in
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ name }); // Mock signup
    navigate('/dashboard');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center items-center flex-1 w-full mt-10"
    >
      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-8 rounded-xl w-full max-w-md shadow-lg transition-colors duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-gray-500 dark:text-zinc-400">Join PitchVision today</p>
        </div>

        <button className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mb-4">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5"/> 
          Continue with Google
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
          <span className="px-3 text-zinc-500 text-sm">OR</span>
          <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 rounded-lg bg-white dark:bg-black border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-lg bg-white dark:bg-black border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1 mb-2">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 rounded-lg bg-white dark:bg-black border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition-all"
          >
            Create Account
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 dark:text-zinc-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-green-500 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
