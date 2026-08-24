alert('Welcome to Ramdeobaba University Nagpur')
        const daysOfWeek = [
            'sun', 'mon',
            'tue', 'wed',
            'thur', 'fri',
            'sat'
        ];
        const months = [
            'JAN', 'FEB', 'MAR',
            'APR', 'MAY', 'JUN',
            'JUL', 'AUG', 'SEP',
            'OCT', 'NOV', 'DEC',
        ];
        const $ = (id) => document.getElementById(id);
        const zeroPadding = (num) => String(num).padStart(2, '0');
        function clock() {
            const today = new Date();
            const h = today.getHours();
            const m = today.getMinutes();
            const s = today.getSeconds();
            const ampm = h < 12 ? 'AM' : 'PM';
            const day = today.getDay();
            const date = today.getDate();
            const month = today.getMonth();
            const year = today.getFullYear();

            $('hours').innerHTML = zeroPadding(h % 12 || 12); // Convert to 12-hour format
            $('min').innerHTML = zeroPadding(m);
            $('sec').innerHTML = zeroPadding(s);
            $('ampm').innerHTML = ampm;
            daysOfWeek.forEach((dayId) => $(dayId).classList.remove('active')); // Remove active class from all days
            $(daysOfWeek[day]).classList.add('active'); // Add active class to the current day
            $('year').innerHTML = year;
            $('month').innerHTML = months[month];
            $('day').innerHTML = zeroPadding(date);
        }
        setInterval(clock, 400);
