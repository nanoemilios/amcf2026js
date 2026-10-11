// Fade in main on load (replaces jpreLoader)
$(function () {
	$('#main').animate({"opacity":'1'},{queue:false,duration:700,easing:"easeInOutQuad"});
});


function initAmcf() {

// functions ------------------
	"use strict";
	
	var ino = $('.navigation');
	var $tElems = $('.inner a');
	var ct = $('.inner a').length;
	var al = {queue:true,duration:800,easing:"easeInOutQuad"};
	var bo = $('.body-overlay');
	var $mem = $('.member-box');
	var memlenght = $('.member-box').length;
	var $project = $('.box a');
	var projectlenght = $('.box a').length;	    
	
	
// show menu ------------------	

	function showmenu(){
		$(".nav-button").addClass('nav-rotade');
		ino.animate({"left":'0'},al);          
		ino.removeClass("isDown");
		bo.fadeIn();		
		setTimeout( function(){		
			for (var i = 0; i <= ct; i++) {
				var cft = $tElems[i];
				$(cft).delay(150 * i).animate({'opacity' : '1',left:'0'},al); 
			}
		},100);
	}
	
// hide menu ------------------

	function hidemenu(){
		$(".nav-button").removeClass('nav-rotade');
		ino.animate({"left":'-200px'},al);   
		ino.addClass("isDown");
		bo.fadeOut();		
		setTimeout( function(){					
			for (var i = 0; i <= ct; i++) {
				var cft = $tElems[i];
				$(cft).delay(150 * i).animate({'opacity' : '0',left:'-25%'},al);				 
			}		
		},100);
	}
		
// project show ------------------

	function showprojectbox(){
			setTimeout( function(){					
				for (var i = 0; i <= projectlenght; i++) {
					var projectb = $project[i];
					$(projectb).delay(250 * i).animate({'opacity' : '1',top:'0'},1000);				 
				}		
			},600);
		}	
		
// call menu ------------------

	window.navMenuBusy = false;
	$(".nav-button").on('click', function(e) {
		e.stopPropagation();
		e.preventDefault();
		if (window.navMenuBusy) return;
		window.navMenuBusy = true;
		setTimeout(function() { window.navMenuBusy = false; }, 1000);
		if ($('.navigation').hasClass("isDown") ) {
			showmenu();
		} else {
			hidemenu();
		}	
	});
	
// navigation links ------------------

	$(".inner a.scroll-link").on('click', function(event) {
		event.preventDefault();
		var target = $(this).attr('href'), top = 0;
		if (target && target !== '#' && $(target).length) {
			top = $(target).offset().top - 25;
		}
		$('html,body').stop().animate({ scrollTop: top }, 950, 'swing');
		setTimeout( function(){	
			hidemenu();				 	
		},900);	
	});

	// body-overlay click to close menu
	$(".body-overlay").on('click', function(event) {
		// Ignore clicks on nav-button or inside navigation
		if ($(event.target).closest('.nav-button, .navigation').length) {
			return;
		}
		// Ignore if menu is busy animating
		if (window.navMenuBusy) return;
		hidemenu();
	});
	
// Call plugins  ----------------------------------------
	
//  superslides --------
	
	$('#slides').superslides({
		animation: 'fade',
		play: 10000
	});
	$('#slides').hammer().on('swipeleft', function() {
		$(this).superslides('animate', 'next');
	});
	
	$('#slides').hammer().on('swiperight', function() {
		$(this).superslides('animate', 'prev');
	});	
	
//  scroll nav --------
		
	$('#nav').onePageNav({
		currentClass: 'current',
		changeHash: false,
		scrollSpeed: 750,
		scrollOffset: 30,
		scrollThreshold: 0.5,
		filter: '',
		easing: 'swing',
	});

// owlCarousel  --------
   
	$("#clientsay").owlCarousel({		   
		navigation : true,
		pagination:true, 
		slideSpeed : 300,
		paginationSpeed : 400,
		singleItem:true,
		transitionStyle : "goDown"			  
	});
	
	// client logos – seamless infinite marquee (pure CSS, duplicate items for a loop)
	var $clientCarousel = $("#client-carusel");
	if ($clientCarousel.length && $clientCarousel.children(".item").length) {
		$clientCarousel.children(".item").clone(true).appendTo($clientCarousel);
	}

    // about – alle Inhalte dauerhaft sichtbar (kein versteckter Slider mehr);
	// Skillbars animieren automatisch, sobald der Bereich sichtbar ist.
	function animateAboutSkills() {
		$('#about .skillbar').each(function () {
			var $bar = $(this).find('.skillbar-bar');
			if ($bar.attr('data-animated')) { return; }
			$bar.attr('data-animated', '1').animate({ width: $(this).attr('data-percent') }, 3000);
		});
	}
	function onAboutVisible() {
		var $about = $('#about');
		if (!$about.length) { return; }
		var top = $about.offset().top;
		var bottom = top + $about.outerHeight();
		var vp = $(window).scrollTop() + $(window).height();
		if (vp > top && $(window).scrollTop() < bottom) { animateAboutSkills(); }
	}
	$(window).on('scroll resize', onAboutVisible);
	onAboutVisible();
		 
// flexslider  --------
	if ($.fn.flexslider) {
		$('.serviseslider').flexslider({
			animation: "slide",
			smoothHeight: true,
			slideshow: false,
			controlNav: false,              
			directionNav: false,
			startAt: 1, 
			start: function(slider) {			
				$('a.animbox').click(function() {
					var slideTo = $(this).attr("name")
					var slideToInt = parseInt(slideTo)
					var ww = $(window).width();			
					if (slider.currentSlide != slideToInt) 
					{					
						slider.flexAnimate(slideToInt)
					}				
					if(ww < 959){									
						setTimeout( function(){
							$('html').scrollTo('.serviseslider',800,{'axis':'y'} );									
						},600);							
					}
				});
			}
		});
		
		$('.resume-slider').flexslider({
			animation: "slide",
			slideDirection: "horizontal",
			slideshow: false,
			slideshowSpeed: 3500,
			animationDuration: 500,
			directionNav: true,
			controlNav: false,
		});

		$('.single-media').flexslider({
			animation: "slide",
			slideDirection: "horizontal",
			slideshow: false,
			slideshowSpeed: 3500,
			animationDuration: 500,
			directionNav: true,
			controlNav: false,
		});
	}
		
// magnificPopup   --------	
	
	$('.image-popup').magnificPopup({
		type: 'image',
		closeOnContentClick: true,
		mainClass: 'mfp-img-mobile',
		image: {
			verticalFit: true
		}    
	});	
		
	$('.service_box').click(function(){	  
	  $('.service_box').removeClass('actser');
	  $(this).addClass('actser');	  
	});
	
	$('#options li').click(function(){	  
	  $('#options li').removeClass('actcat');
	  $(this).addClass('actcat');  
	});  
	
// Scroll animation   ----------------------------------------
	
	$('.animaper').appear();
		
	$(document.body).on('appear', '.present-block', function() {
		$(this).each(function(){ 			
			setTimeout (function (){				
				$('.present-block').animate({opacity:'1', top:'0'},{queue:true,duration:1200});
			}, 600 ); 
		});
	});
	
	$(document.body).on('appear', '.service_box', function() {
		$(this).each(function(){ 				
				$('.service_box').animate({opacity:'1', top:'0'},{queue:true,duration:1200});
		});
	});
	
	$(document.body).on('appear', '#folio_container', function() {
		$(this).each(function(){ 			
				showprojectbox();
		});
	});
	
	$(document.body).on('appear', '.resume-line', function() {
		$(this).each(function(){ 			
				$('.resume-line').animate({height:'100%'},{queue:true,duration:3200});
		});
	});	
	
	$(document.body).on('appear', '.resume-box', function() {
		$(this).each(function(){ 			
			setTimeout (function (){	
				$('.resume-box').animate({opacity:'1', top:'0'},{queue:true,duration:1200});
			}, 800 );
		});
	});	
		
	$(document.body).on('appear', '.smallicon', function() {
		$(this).each(function(){ 			
			setTimeout (function (){	
				$('.smallicon').animate({opacity:'0.8', top:'0'},{queue:true,duration:1200});
			}, 200 );
		});
	});
	
//  Mixitup  ------
	
	$('#folio_container').mixitup({
		targetSelector: '.box',
		effects: ['fade','rotateZ','rotateX','rotateY'],
		easing: 'windback',
		transitionSpeed: 1200,
	});	
	

// Scroll to  --------

	$('.to-top').on('click', function(e) { e.preventDefault(); $('html').scrollTo('#topSlide, .simple-page-head',1500,{'axis':'y'}); hidemenu(); });
	$('.logo').on('click', function(e) { e.preventDefault(); e.stopPropagation(); $('html').scrollTo('#topSlide, .simple-page-head',1500,{'axis':'y'}); hidemenu(); });
	$('.start').on('click', function() { $('html').scrollTo('#about',1500,{'axis':'y'}); });
	
	$('.actform').click(function() {
		$('.contactForm').slideToggle(1000);
		setTimeout (function (){	
			$('html').scrollTo('.to-top',1000,{'axis':'y'});	
		}, 800 );	

});

// Subscribe   ----------------------------------------

	$('.subscriptionForm').submit(function(){		
		var email = $('#subscriptionForm').val();
		$.ajax({
			url:'php/subscription.php',
			type :'POST',
			dataType:'json',
			data: {'email': email},success: function(data){
				if(data.error){
					$('#error').fadeIn()
				}
				else{
					$('#success').fadeIn();
					$("#error").hide();}
				}
			});
		return false
	});
	
	$('#subscriptionForm').focus(function(){
		$('#error').fadeOut();
		$('#success').fadeOut();	
	});
	
	$('#subscriptionForm').keydown(function(){	
		$('#error').fadeOut();
		$('#success').fadeOut();		
	});	 	
				
};

// Contact submit  ----------------------------------------

	$("#submit_btn").click(function(){		
		var user_name=$('input[name=name]').val();
		var user_email=$('input[name=email]').val();
		var user_message=$('textarea[name=message]').val();
		var proceed=true;
			if(user_name==""){
				$('input[name=name]').css('border','1px solid #E75B00');
				proceed=false
			}
			if(user_email==""){
				$('input[name=email]').css('border','1px solid #E75B00');
				proceed=false
			}
			if(user_message==""){
				$('textarea[name=message]').css('border','1px solid #E75B00');
				proceed=false
			}
			if(proceed){
				post_data={'userName':user_name,'userEmail':user_email,'userMessage':user_message};
				$.post('php/contact_me.php',
				post_data,
				function(data){
					$("#result").hide().html('<div class="success">'+data+'</div>').slideDown(500);
					$('#contact_form input').val('');
					$('#contact_form textarea').val('')}).fail(
						function(err){
							$("#result").hide().html('<div class="error">'+err.statusText+'</div>').fadeIn(1500)
					});
			}
	});
	
	$("#contact_form input, #contact_form textarea").keyup(function(){		
			$("#contact_form input, #contact_form textarea").css('border','1px solid #101011');
			$("#result").fadeOut(1500)			
	});

// Ajax portfolio   ----------------------------------------

// Local projects are no longer loaded: projects live in index.html and are
// edited through admin-content.html. Kept only so the lightbox guards below
// still have a defined (always empty) collection.
var LOCAL_PROJECTS = [];

// get the committed public data (data/projects.js) if present
function getSiteData() {
	if (window.AMCF_SITE_DATA) { return window.AMCF_SITE_DATA; }
	return { edits: {}, projects: [] };
}

// merged resume overrides (committed data + admin's localStorage working set)
function getResumeData() {
	var base = getSiteData().resume || { facts: {}, jobs: {}, newJobs: [] };
	var out = {
		facts: {},
		jobs: {},
		newJobs: []
	};
	var bf = base.facts || {};
	for (var k in bf) { if (Object.prototype.hasOwnProperty.call(bf, k) && bf[k] != null && bf[k] !== '') { out.facts[k] = bf[k]; } }
	var bj = base.jobs || {};
	for (var j in bj) { if (Object.prototype.hasOwnProperty.call(bj, j) && bj[j] && typeof bj[j] === 'object' && Object.keys(bj[j]).length) { out.jobs[j] = bj[j]; } }
	var bn = Array.isArray(base.newJobs) ? base.newJobs : [];
	out.newJobs = bn.filter(function (x) { return x && typeof x === 'object' && Object.keys(x).length; });
	// localStorage wins
	try {
		var raw = localStorage.getItem('amcf_local_resume');
		var loc = raw ? JSON.parse(raw) : null;
		if (loc) {
			var lf = loc.facts || {};
			for (var k2 in lf) { if (Object.prototype.hasOwnProperty.call(lf, k2) && lf[k2] != null && lf[k2] !== '') { out.facts[k2] = lf[k2]; } }
			var lj = loc.jobs || {};
			for (var j2 in lj) { if (Object.prototype.hasOwnProperty.call(lj, j2) && lj[j2] && typeof lj[j2] === 'object' && Object.keys(lj[j2]).length) { out.jobs[j2] = lj[j2]; } }
			if (Array.isArray(loc.newJobs) && loc.newJobs.length) {
				out.newJobs = loc.newJobs.filter(function (x) { return x && typeof x === 'object' && Object.keys(x).length; });
			}
		}
	} catch (e) { /* ignore */ }
	return out;
}

var RESUME_JOB_FIELDS_LITE = ['date','title','text','l1','l2','l3','l4','l5','l6','l7'];

// apply resume overrides to the DOM (run after i18n render)
/* The job number must come from the holder's resume.jobN.* data-i18n keys.
   data-rvnum is NOT the job number and is not even unique (job11 and job9 are
   both rvnum 2), so it is only a last-resort fallback. */
function jobNumFromKeys(rvnum, keys) {
	for (var i = 0; i < keys.length; i++) {
		var m = /resume\.job(\d+)\./.exec(keys[i] || '');
		if (m) { return parseInt(m[1], 10); }
	}
	var n = parseInt(rvnum, 10);
	return isNaN(n) ? null : n;
}

function holderJobNum($holder) {
	var keys = [];
	$holder.find('[data-i18n], [data-i18n-html]').each(function () {
		keys.push($(this).attr('data-i18n') || '');
		keys.push($(this).attr('data-i18n-html') || '');
	});
	return jobNumFromKeys($holder.attr('data-rvnum'), keys);
}

	$(document).ready(function(){
		initAmcf();
	});

//  definition of mobile browser------------------

	var isMobile = { 
       Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function() {
            return navigator.userAgent.match(/IEMobile/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
        }
		
    };
	
// if not mobile ------------------  	
	trueMobile = isMobile.any();
	if (trueMobile == null){
		
// parallax  --------	

	$('#servises').parallax("50%", 0.4);
	$('#subscribe').parallax("80%", 0.2);
	$('#resume .content').parallax("80%", 0.2);
	$('.simple-page-head').parallax("50%", 0.4);
	
// hoverdir --------
	
	$(' #folio_container > li ').each(function(){$(this).hoverdir();});
	
// lavaLamp --------
	
	$("#options ul").lavaLamp({
    	fx: "easeOutElastic", 
    	speed: 700,
    });	
	
// Hover animation   ---	
				
		$('.box a').hover(function(){
			$(this).find('img').addClass('img-rotade');		
			},function(){
			$(this).find('img').removeClass('img-rotade');	
		});			
						
	}

// =============== project lightbox ===============

var pbCurrent = null;
var pbTrigger = null;
var pbName = '';
var LOCAL_COUNT = 8;

function pbIsLocal(idx) {
	return typeof idx === 'number' && idx >= LOCAL_COUNT && idx - LOCAL_COUNT < LOCAL_PROJECTS.length;
}

function pbLocalItem(idx) {
	return LOCAL_PROJECTS[idx - LOCAL_COUNT] || null;
}

function pbGetDict(lang) {
	if (!window.AMCF_I18N_LANGS) { return null; }
	if (!lang) {
		lang = window.AMCF_I18N && window.AMCF_I18N.getLang ?
			window.AMCF_I18N.getLang() : 'de';
	}
	return window.AMCF_I18N_LANGS[lang] || window.AMCF_I18N_LANGS.de;
}

function pbOpen(idx, $link) {
	pbCurrent = idx;
	pbTrigger = ($link && $link.get) ? $link.get(0) || null : null;
	pbName = $link.find('h4').text().trim() || '';
	var img = $link.find('img').attr('src') || '';
	$('#projectLightbox').find('.pb-img').attr('src', img).attr('alt', pbName);
	pbFill();
	$('#projectLightbox').addClass('open').attr('aria-hidden', 'false');
	$('body').css('overflow', 'hidden');
	$('#projectLightbox').find('.pb-close').focus();
}

function pbClose() {
	if (pbCurrent === null && !pbTrigger) { return; }
	pbCurrent = null;
	var trig = pbTrigger;
	pbTrigger = null;
	// move focus back to the trigger before hiding (avoids aria-hidden focus warnings)
	var trigConnected = trig && trig.isConnected !== false && document.documentElement.contains(trig);
	if (trig && trigConnected && trig.focus) { trig.focus(); }
	else if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); }
	$('#projectLightbox').removeClass('open').attr('aria-hidden', 'true');
	$('body').css('overflow', '');
}

function pbFill(newLang) {
	if (pbCurrent === null) { return; }
	// local project (from admin localStorage)
	if (pbIsLocal(pbCurrent)) {
		var lp = pbLocalItem(pbCurrent);
		var d0 = pbGetDict(newLang);
		var lb0 = (d0 && d0.port && d0.port.lightbox) ? d0.port.lightbox : {};
		var $l = $('#projectLightbox');
		$l.find('.pb-title').text(pbName);
		$l.find('.pb-tags').text(lp.tags || '');
		var $de = $l.find('.pb-description');
		if (lp.desc) { $de.text(lp.desc).show(); } else { $de.hide(); }
		if (lp.client) { $l.find('.pb-client-value').text(lp.client); $l.find('.pb-client-label').text(lb0.client || 'Client'); $l.find('.pb-client').show(); }
		else { $l.find('.pb-client').hide(); }
		if (lp.date) { $l.find('.pb-date-value').text(lp.date); $l.find('.pb-date-label').text(lb0.date || 'Date'); $l.find('.pb-date').show(); }
		else { $l.find('.pb-date').hide(); }
		if (lp.url) { $l.find('.pb-visit').attr('href', lp.url).text(lb0.visit || 'Visit'); $l.find('.pb-link').show(); }
		else { $l.find('.pb-link').hide(); }
		$l.find('.pb-close').text(lb0.close || 'Close');
		return;
	}

	var d = pbGetDict(newLang);
	var dictItem = (d && d.port && d.port.items && d.port.items[pbCurrent]) ? d.port.items[pbCurrent] : {};

	// The source language (index.html markup) carries the German project data.
	// Fall back to the marker-delimited attributes on each project tile.
	var $tile = $('#folio_container .folio-open[data-project="' + pbCurrent + '"]').closest('.box');
	var item = {
		desc: dictItem.desc || $tile.attr('data-desc') || '',
		client: dictItem.client || $tile.attr('data-client') || '',
		date: dictItem.date || $tile.attr('data-date') || '',
		url: dictItem.url || $tile.attr('data-url') || ''
	};
	// tags come from the dictionary when translated, otherwise from the markup
	var markupTags = $tile.find('h6').first().text() || '';
	var tags = ((d.port && d.port.tags && d.port.tags[pbCurrent]) || markupTags);
	var lb = (d.port && d.port.lightbox) || {};

	var $light = $('#projectLightbox');
	$light.find('.pb-title').text(pbName);

	var $tagEl = $light.find('.pb-tags');
	$tagEl.text(tags)['attr']('data-i18n-raw', '');

	var $desc = $light.find('.pb-description');
	if (item.desc) { $desc.text(item.desc).show(); } else { $desc.text('').hide(); }

	if (item.client) {
		$light.find('.pb-client-value').text(item.client);
		$light.find('.pb-client-label').text(lb.client || 'Client');
		$light.find('.pb-client').removeAttr('hidden').show();
	} else {
		$light.find('.pb-client').attr('hidden', 'hidden').hide();
	}

	if (item.date) {
		$light.find('.pb-date-value').text(item.date);
		$light.find('.pb-date-label').text(lb.date || 'Date');
		$light.find('.pb-date').removeAttr('hidden').show();
	} else {
		$light.find('.pb-date').attr('hidden', 'hidden').hide();
	}

	var $visit = $light.find('.pb-link');
	if (item.url) {
		$light.find('.pb-visit').attr('href', item.url).text(lb.visit || 'Visit');
		$visit.removeAttr('hidden').show();
	} else {
		$visit.attr('hidden', 'hidden').hide();
	}

	// close-button label
	$light.find('.pb-close').text(lb.close || 'Close');
}

$(function () {
	var $openLinks = $('.folio-open');
	if ($openLinks.length === 0) { return; }

	$('#folio_container').on('click', '.folio-open', function (e) {
		e.preventDefault();
		pbOpen(parseInt($(this).attr('data-project'), 10), $(this));
	});

	$(document).on('click', '#projectLightbox .pb-overlay', function () {
		pbClose();
	});
	$(document).on('click', '#projectLightbox .pb-close', function () {
		pbClose();
	});
	$(document).on('keydown', function (e) {
		if (e.key === 'Escape' || e.keyCode === 27) { pbClose(); }
	});
});

// =============== resume lightbox ===============

var rvCurrent = null;
var rvImages = [];
var rvTrigger = null;

function rvOpen($head) {
	rvCurrent = $head.closest('.resume-holder').get(0) || null;
	rvTrigger = ($head && $head.get) ? $head.get(0) || null : null;
	rvFill();
	$('#resumeLightbox').addClass('open').attr('aria-hidden', 'false');
	$('body').css('overflow', 'hidden');
	var $f = $('#resumeLightbox').find('.pb-close').first();
	if (!$f.length) { $f = $('#resumeLightbox').find('.pb-title').first(); }
	$f.focus();
}

// Show a main image (first image of the entry) in the resume timeline.
var DEFAULT_RESUME_IMG = 'images/resume/1.jpg';
function addResumeMainImages() {
	var $holders = $('#resume .resume-holder');
	$holders.each(function () {
		var $holder = $(this);
		if ($holder.find('.resume-main-img').length) { return; }
		var $slider = $holder.find('.resume-slider');
		var $first = $slider.length ? $slider.find('.slides img').first() : $();
		var src = $first.attr('src');
		if (!src) {
			var $pop = $holder.find('.image-popup img').first();
			if ($pop.length) { src = $pop.attr('src'); }
		}
		if (!src) { src = DEFAULT_RESUME_IMG; }
		var $target = $holder.find('.grid-full.transition.resume').first();
		if (!$target.length) { $target = $holder.find('.resume-box').first(); }
		if (!$target.length) { $target = $holder; }
		$('<img class="resume-main-img" alt="" src="' + src + '">').appendTo($target);
	});
}

function rvClose() {
	if (rvCurrent === null && !rvTrigger) { return; }
	rvCurrent = null;
	rvImages = [];
	var trig = rvTrigger;
	rvTrigger = null;
	// move focus back to the trigger before hiding (avoids aria-hidden focus warnings)
	var rvTrigConnected = trig && trig.isConnected !== false && document.documentElement.contains(trig);
	if (trig && rvTrigConnected && trig.focus) { trig.focus(); }
	else if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); }
	$('#resumeLightbox').removeClass('open').attr('aria-hidden', 'true');
	$('body').css('overflow', '');
}

// resolve the current resume block's text/list/img from i18n + overrides
function rvResolveJob() {
	if (!rvCurrent) { return null; }
	var $holder = $(rvCurrent);

	// image gallery from the DOM block (slider + single popup images)
	var imgs = [];
	$holder.find('img').each(function () {
		var s = $(this).attr('src');
		if (s && imgs.indexOf(s) === -1) { imgs.push(s); }
	});

	// admin/user-added newJobs blocks carry their data in data-rv
	var $head = $holder.find('.resume-head').first();
	var rvRaw = $head.attr('data-rv');
	if (rvRaw) {
		var block;
		try { block = JSON.parse(rvRaw); } catch (e) { block = {}; }
		return {
			title: block.title || '',
			date: block.date || '',
			text: block.text || '',
			lis: Array.isArray(block.lis) ? block.lis : [],
			imgs: imgs
		};
	}

	var num = holderJobNum($holder);

	var d = pbGetDict();
	var job = (d && d.resume && num && d.resume['job' + num]) ? d.resume['job' + num] : {};

	// apply admin overrides (same source as applyResumeOverrides)
	var rd = getResumeData();
	var ov = (rd && rd.jobs && num && rd.jobs[num]) ? rd.jobs[num] : null;
	if (ov) {
		RESUME_JOB_FIELDS_LITE.forEach(function (f) {
			if (ov[f] == null || ov[f] === '') { return; }
			job[f] = ov[f];
		});
	}

	// The source language (index.html markup) carries the German job data.
	function holderText(key) {
		var el = $holder.find('[data-i18n="' + key + '"], [data-i18n-html="' + key + '"]').first();
		if (!el.length) { return ''; }
		return String(el.html() || '').trim();
	}
	var base = 'resume.job' + num + '.';

	return {
		title: job.title || ($holder.find('.resume-head h3 span').first().text() || ''),
		date: job.date || holderText(base + 'date'),
		text: job.text || holderText(base + 'text'),
		lis: RESUME_JOB_FIELDS_LITE.filter(function (f) { return f.indexOf('l') === 0; })
			.map(function (f) { return job[f] || holderText(base + f); })
			.filter(function (v) { return String(v).trim() !== ''; }),
		imgs: imgs
	};
}

function rvFill() {
	if (rvCurrent === null) { return; }
	var job = rvResolveJob();
	if (!job) { return; }

	var $l = $('#resumeLightbox');
	$l.find('.pb-title').text(job.title);
	$l.find('.pb-year').text(job.date);

	var $desc = $l.find('.pb-description');
	if (job.text) { $desc.html(job.text).show(); } else { $desc.text('').hide(); }

	var $list = $l.find('.pb-list');
	$list.empty();
	if (job.lis.length) {
		job.lis.forEach(function (li) {
			$list.append('<li>' + $('<span>').text(li).html() + '</li>');
		});
		$list.show();
	} else {
		$list.hide();
	}

	// gallery
	var $g = $l.find('.pb-gallery');
	$g.empty();
	if (job.imgs.length) {
		job.imgs.forEach(function (src, i) {
			$('<img>').attr('src', src).addClass('pb-thumb' + (i === 0 ? ' on' : '')).appendTo($g);
		});
		$l.find('.pb-img').attr('src', job.imgs[0]);
		$l.find('.pb-image').show();
		$g.show();
		$l.removeClass('no-img');
	} else {
		$l.find('.pb-img').attr('src', '');
		$l.find('.pb-image').hide();
		$g.hide();
		$l.addClass('no-img');
	}

	var dClose = pbGetDict() || {};
	var lbClose = (dClose.port && dClose.port.lightbox) || {};
	$l.find('.pb-close').text(lbClose.close || 'Close');
}

// use the first resume slider image as the lightbox main image
$(document).on('click', '#resumeLightbox .pb-thumb', function () {
	$('#resumeLightbox .pb-thumb').removeClass('on');
	$(this).addClass('on');
	$('#resumeLightbox .pb-img').attr('src', $(this).attr('src'));
});

$(document).on('click', '#resumeLightbox .pb-overlay', function () {
	rvClose();
});
$(document).on('click', '#resumeLightbox .pb-close', function () {
	rvClose();
});
$(document).on('keydown', function (e) {
	if (e.key === 'Escape' || e.keyCode === 27) { rvClose(); }
});

$(function () {
	$('#resume').on('click', '.resume-head, .resume-main-img', function (e) {
		e.preventDefault();
		rvOpen($(this));
	});
	addResumeMainImages();
});

// re-fill open lightbox on language change
$(document).on('AMCF_I18N_RENDER', function (e, lang) {
	pbFill(lang);
	addResumeMainImages();
	rvFill();
});

// Dynamic footer year
function updateFooterYear() {
	var el = document.getElementById('footerCopyright');
	if (el) {
		var year = new Date().getFullYear();
		// Match both &copy; and © Unicode symbol
		el.innerHTML = el.innerHTML.replace(/(&copy;|©)\d{4}/, '$1' + year);
	}
}

$(function () {
	updateFooterYear();
});

// Also update on language change
$(document).on('AMCF_I18N_RENDER', function () {
	updateFooterYear();
});

// =============== dark mode ===============

$(function () {
	var $check = $('#dmSwitch');
	if (!$check.length) { return; }

	function setDark(on) {
		$check.prop('checked', !!on);
		$('body').toggleClass('dark', !!on);
		try { localStorage.setItem('amcf_dark', on ? '1' : '0'); } catch (e) {}
	}

	$check.prop('checked', $('body').hasClass('dark'));

	$check.on('change', function () {
		setDark(this.checked);
	});
});