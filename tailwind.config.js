/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './backend/admin/*.html',
    './backend/admin/**/*.html',
    './backend/admin/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#c41e1e',
        'primary-dark': '#8a1515',
        'primary-light': '#e74c3c',
        secondary: '#2c3e50',
        success: '#27ae60',
        'success-light': '#2ecc71',
        danger: '#e74c3c',
        'danger-dark': '#c0392b',
        warning: '#f39c12',
        info: '#3498db',
        light: '#ecf0f1',
        dark: '#1a1a1a',
        'bg-light': '#f5f6f8',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
