/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                google: {
                    blue: '#4285F4',
                    red: '#EA4335',
                    yellow: '#FBBC05',
                    green: '#34A853',
                },
                surface: {
                    light: '#FFFFFF',
                    variant: '#F1F3F4',
                },
                primary: {
                    DEFAULT: '#1A73E8',
                    dark: '#174EA6',
                }
            },
            fontFamily: {
                sans: ['Google Sans', 'sans-serif'],
                plate: ['Euro Plate', 'monospace'],
            },
        },
    },
    plugins: [],
}
