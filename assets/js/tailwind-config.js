/* Общая тема Tailwind для всех страниц (подключается сразу после cdn.tailwindcss.com) */
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Space Grotesk"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                archive: {
                    bg: '#F4F0EA',
                    orange: '#FF5722',
                    lime: '#CCFF00',
                    cyan: '#00E5FF',
                    violet: '#B388FF',
                    dark: '#121212'
                }
            }
        }
    }
};
