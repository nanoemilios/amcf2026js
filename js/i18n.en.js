(function () {
	"use strict";
	if (!window.AMCF_I18N_LANGS) { window.AMCF_I18N_LANGS = {}; }
	window.AMCF_I18N_LANGS.en = {
		metaTitle: 'Alberto M. Costa (CV)',
		metaDesc: 'CV / Alberto Manuel Costa Ferreiro',
		nav: {
			about: 'About Me',
			services: 'Skills',
			portfolio: 'Portfolio',
			resume: 'Resume',
			contacts: 'Contact',
			dark: 'Dark mode'
		},
		slide1: { kicker: 'Welcome to', title1: 'My Resume', name: 'Alberto M. Costa', sub: 'Scroll down for more details', h1: 'My Resume <br/> <span>Alberto M. Costa</span>' },
		slide2: { kicker: 'Resume', title1: 'That\u0027s', title2: 'Me', sub: 'My Design\u0027s and Web\u0027s', h1: '<span>That\u0027s </span> Me' },
		slide3: { kicker: 'International', title: 'World Wide Welcome', sub: 'From nowbody to AMCF' },
		about: {
			head: 'Who I am',
			title: 'About Me',
			intro: 'I am a motivated web designer with experience in all possible fields of IT.',
			introHtml: '<img src="images/ipad7.png" class="present-block animaper right" alt="Alberto M. Costa" title="Alberto M. Costa">I was able to work as a web designer and PC supporter in Spain for 7 years and gathered valuable experience in customer acquisition and consulting in a B2B/B2C environment. Thanks to the variety of customers and their requirements, I became familiar with almost all systems and configurations. I have studied search engine optimisation in depth and am thoroughly familiar with website optimisation. Consulting, selling and installing software and hardware were part of my daily routine, as were designing and managing new design and communication strategies.<br>In my role as team leader at Hug Engineering I had to lead a team and motivate it to peak performance. Among other things, loading and maintaining the reactors was part of my responsibility, as were managing goods in/out, machine operation and transport securing. Ensuring the specified quality requirements was an essential part of my duties.',
			next: 'next',
			philTitle: 'My Philosophy',
			philText: 'Be a good person. This sentence has followed me throughout my life and shaped my way of acting.',
			missTitle: 'My Mission',
			missText: 'Use my knowledge and craftsmanship to make the world a little better.',
			skillsTitle: 'My Skills',
			close: 'Next'
		},
		skills: ['HTML5/CSS/JS/PHP', 'CMS Systems', 'Online Marketing', 'Graphic Design', 'Responsive Design', 'eCommerce', 'PC Hardware / Software'],
		services: {
			title: 'My Services',
			box1: 'IT Services',
			box2: 'Web Design',
			box3: 'Graphic Design',
			s1title: 'IT Services',
			s1sub: 'Computer Installation, Repair and Maintenance',
			s1text: 'My experience in PC support includes the hardware, software and networking knowledge I gained through my PC Master training. I expanded this knowledge through years of experience in my own IT support company. Over time I not only installed PCs but also took on and managed the consulting, purchasing and administration.',
			s2title: 'Web Design',
			s2sub: 'Web Design / Responsive Design / Landing Pages',
			s2text: 'After my training as a web designer and multimedia professional, I opened a small studio in the field of web design. Over time several other professionals joined and we gathered experience in all possible areas, from photographing products for an online shop to designing a corporate identity.',
			s3title: 'Print Design',
			s3sub: 'Branding / Posters / Flyers',
			s3text: 'Designing logos and the matching advertising has over time become a very large part of my daily life. Always developing something new keeps the passion for this profession fresh and ambitious. I was able to gather a lot of experience in this area and it gave me great pleasure.'
		},
		test1p: '"Professionalism and a drive to offer the best possible service."',
		test1s: '- Finelli Caffè GmbH',
		test2p: '"In our company Alberto took over the whole IT and web area and mastered it successfully."',
		test2s: '- Kallamos GmbH',
		test3p: '"Great. That\u0027s all we can say about the guys from Bipresent. They had a solution for all our problems."',
		test3s: '- O Mundo do Té via Facebook',
		port: {
			head: 'Portfolio',
			title: 'My Work',
			intro: 'Here is a small part of my work.',
			all: 'All',
			web: 'Web',
			ecommerce: 'eCommerce',
			branding: 'Branding',
			video: 'Video',
			close: 'Close',
			tags: [
				'eCommerce / Design / Web',
				'Design / Web',
				'Branding / Video',
				'eCommerce / Branding / Web',
				'EcoLocal / eCommerce / Web',
				'Branding / Design / IT Services',
				'eCommerce / Branding / Web',
				'Web / Design / Branding / IT Services'
			],
			lightbox: {
				close: 'Close',
				client: 'Client',
				date: 'Year',
				tags: 'Tags',
				visit: 'Visit project'
			},
			items: [
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' },
				{ desc: '', client: '', date: '', url: '' }
			]
		},
		sub: {
			head: 'Subscribe',
			text: 'Sign up for my newsletter.',
			placeholder: 'Enter Your Email Address',
			send: 'Send',
			success: 'Thank you',
			error: 'Please enter a valid email address'
		},
		resume: {
            job1: {
				date: '1997 - 1999',
				title: 'Migros - Switzerland (Warehouse Apprentice)',
            facts: {
                name: 'Name:', address: 'Address:', address2: '8500 Frauenfeld',
                web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nationality:',
                birth: 'Date of birth:', license: 'Driving licence:', civil: 'Marital status:', permit: 'Residence permit:',
                nationV: 'Spanish', civilV: 'Married', birthV: '2 April 1980', licenseV: 'Cat. B', permitV: 'C'
            },
				text: 'At <a href="https://www.migros.ch" target="_blank" class="company-color">Migros</a> I started my apprenticeship as a warehouse worker and successfully completed it over 2 years.'
			},
            job2: {
				date: '1999-2002',
				title: 'Coop - Suisse (Salesperson)',
				text: 'At <a href="https://www.coop.ch" target="_blank" class="company-color">Coop Switzerland</a> I had a very educational time and learned a lot about everyday working life.'
			},
            job3: {
				date: '06.2002 - 05.2007',
				title: 'Hug Engineering AG (Team Leader)',
				l1: 'Manufacturing, repair and service of catalysts and particulate filters.',
				l2: 'Quality control',
				l3: 'Goods in/out administration'
			},
            job4: {
				date: '2003 - 2005',
				title: 'BVS Winterthur (PC Master)',
				l1: 'Installing and repairing hardware and software',
				l2: 'Installation and administration of networks',
				l3: 'Introduction to web design HTML – CSS – JS',
				l4: 'ECDL – European Computer Driver\u0027s License'
			},
            job5: {
				date: '2005',
				title: 'Certified Web Designer (EU Standard)',
				text: 'Centro Municipal de Formación, Cambre, A Coruña. With over 300 hours there I earned my diploma as web designer and multimedia professional. <a href="https://www.cambre.org" target="_blank" class="company-color">Cambre.org</a> A Coruña - Spain.',
				l1: 'Web design and multimedia',
				l2: 'HTML – CSS – JS – PHP - SQL'
			},
            job6: {
				date: '08.2008 - 12.2013',
				title: 'Bipresent.com',
				text: 'My self-employment as web designer and IT specialist. At <a href="https://www.bipresent.com" target="_blank" class="company-color">Bipresent.com</a> I gathered a great deal of experience and knowledge in all of these areas:',
				l1: 'Web Design', l2: 'IT Consulting', l3: 'Cash Register Systems', l4: 'eCommerce', l5: 'Branding', l6: 'PC Support', l7: '...'
			},
            job7: {
				date: '06.2013 - 06.2014',
				title: 'Hug Engineering AG',
				text: 'At <a href="https://www.hug-eng.ch" target="_blank" class="company-color">Hug Engineering AG</a> I regained the physical strength and peace of mind as a production worker that I need to master my tasks.'
			},
            job8: {
				date: '07.2014 - 12.2014',
				title: 'Swiss Post',
				text: 'At <a href="https://www.post.ch" target="_blank" class="company-color">Post</a> I was responsible for coding parcels and sorting bulk goods in the Frauenfeld parcel centre.'
			},
            job9: {
				date: '07.2015 - 04.2019',
				title: 'Schindler Elevator AG',
				text: 'At <a href="https://www.schindler.ch" target="_blank" class="company-color">Schindler Elevator AG</a> I trained as an elevator service technician and have carried out this work in recent years.'
			},
            job10: {
				date: '04.2019 - 09.2020',
				title: 'Garaventa Lift AG',
				text: 'At Garaventa Lift AG (<a href="https://www.garaventalift.ch" target="_blank" class="company-color">Garaventa</a>) I am responsible for the maintenance and repair of home lifts and lifting platforms. A varied job that brings many challenges.'
			},
            job11: {
				date: '09.2020 - Present',
				title: 'AS Lifts AG',
				text: 'At <a href="https://www.lift.ch" target="_blank" class="company-color">AS Lifts AG</a> I further developed as a lift service technician. As a field trainer I advanced to troubleshooter and trained new employees.'
			},
download: 'Download CV'
		},
		contacts: {
			name: 'Name', email: 'Email', msg: 'Message', send: 'SEND',
			address: 'Auenstrasse 7a<br>8500 Frauenfeld, Switzerland'
		},
		footer: '&copy;2014 albertocosta.info  All rights reserved.'
	};
})();