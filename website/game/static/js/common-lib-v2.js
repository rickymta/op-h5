'use strict';


var DnDMoM = {};
//functions
DnDMoM = (function($) {
    var $window = $(window);
    var _options = {
        swiper: {
            mode: 'horizontal',
            loop: false,
            slidesPerView: 'auto',
            slideElement: 'li'
        }
    }

    return {
        initMainNav: function() {
            //main navigation
            var mainNav = $('#main-nav');
            var mainNavList = $('#main-nav__list');
            var subNav = $('#extra-content');
            var mainNavTriggerEvent = Modernizr.touch ? 'touchend' : 'click';
            mainNavList
                .on(mainNavTriggerEvent, ' > li > ul a', function(e) {
                    e.stopPropagation();
                })
                .on(mainNavTriggerEvent, ' > li > a.main-nav__has-sub', function(e) {
                    $('#main-nav__list > li > a.main-nav__has-sub.focus').not(this).removeClass('focus');
                    $(this).toggleClass('focus');
                    return false;
                });
            $(document).on(mainNavTriggerEvent, function(e) {
                $('#main-nav__list > li > a.main-nav__has-sub.focus').removeClass('focus');
            });

            //listen main nav change
            // DnDMoM.sub('mainNav:changed', function(section, cate) {
            //     mainNavList.find('a.active').removeClass('active');
            //     mainNavList.find('a[href$="' + section + '.html#!' + cate + '?p=1"]').addClass('active');
            // });

            //init state for reload page
            if (mainNavList.find('a.active').length == 0) {
                var section = window.location.href.split('/').pop();
                var sectionRegExp = new RegExp('.html', 'g');
                if (sectionRegExp.test(section)) {
                    mainNavList.find('a[href$="' + section + '"]').addClass('active');
                    //haedit-add active parent also
                    mainNavList.find('a[href*="' + section + '"]').closest('ul').siblings('a').addClass('active');

                } else {
                    mainNavList.find('a').eq(0).addClass('active');
                }
            }

            var drawToggle = $('#drawer-toggle');
            var subDrawToggle = $('#sub-drawer-toggle');
            var _fn_ = function() {
                if (Modernizr.mq('only screen and (max-width: 1024px)')) {
                    drawToggle.on('change', function() {
                        if ($(this).is(':checked')) {
                            mainNav.addClass('shown');
                        } else {
                            setTimeout(function() {
                                mainNav.removeClass('shown');
                            }, 250);
                        }
                    });
                    subDrawToggle.on('change', function() {
                        if ($(this).is(':checked')) {
                            subNav.addClass('shown');
                        } else {
                            setTimeout(function() {
                                subNav.removeClass('shown');
                            }, 250);
                        }
                    });
                }
            }
            $window.on('resize', _fn_);
            _fn_();

            //swipe main-nav on/off
            if (Modernizr.mq('only screen and (max-width: 1024px)')) {
                $window.swipeListener({
                    minX: 25,
                    minY: 0,
                    swipeRight: function(e) {
                        if (e.coords.start.x <= $window.width() * .25 && Math.abs(e.coords.start.y - e.coords.stop.y) <= 20) {
                            drawToggle.prop('checked', 'checked');
                            $('#main-nav').addClass('shown');
                        }
                    },
                    swipeLeft: function(e) {
                        if (Math.abs(e.coords.start.y - e.coords.stop.y) <= 20) {
                            drawToggle.prop('checked', false);
                            setTimeout(function() {
                                mainNav.removeClass('shown');
                            }, 250);
                        }
                    },
                    swipeUp: function(e) {
                        return true;
                    },
                    swipeDown: function(e) {
                        return true;
                    }
                });
            }

            return mainNavList;
        },

        // search action
        searchFieldAction: function() {
            var $search = $('#site-search');
            var search__open = $('#search__open');

            search__open.click(function() {
                if ($search.hasClass('search__open')) {
                    $search.removeClass('search__open');
                    search__open.css('z-index', 99);
                } else {
                    $search.addClass('search__open');
                    search__open.css('z-index', 1);
                }
                return false;
            });
            $(document).click(function() {
                $search.removeClass('search__open');
                search__open.css('z-index', 99);
            });
            $('#site-search .site-search__field').click(function(evt) {
                evt.stopPropagation();
            });
        },


        initTopButton: function() {
            var topButton = $('#top-button');
            var _height = $(document).height() * 0.5;
            var _fn_ = function() {
                if ($window.scrollTop() >= _height) {
                    if (!topButton.hasClass('flyout-content__top-button--shown')) {
                        topButton.addClass('flyout-content__top-button--shown');
                    }
                } else {
                    topButton.removeClass('flyout-content__top-button--shown');
                }
            }
            $window.on('scroll', function(e) {
                _fn_();
            });
            _fn_();

            var topBtnTriggerEvent = Modernizr.touch ? 'touchstart' : 'click';
            topButton.on(topBtnTriggerEvent, function(e) {
                $('body, html').stop(true, true).animate({
                    scrollTop: 0
                });
                return false;
            });
        },


        initPopup: function(selector) {
            if ($(selector).length > 0) {
                $(selector).fancybox({
                    openEffect: 'elastic',
                    autoCenter: true,
                    padding: [7, 7, 7, 7],
                    helpers: {
                        title: {
                            type: 'inside'
                        },
                        media: {}
                    },
                    nextEffect: 'elastic',
                    prevEffect: 'elastic'
                });
            };
            
        },


        destroySlider: function(object) {
            if (object !== undefined) {
                // destroy and delete swiper object
                var container = $(object.container);
                container.find('*').stop(true, true).removeAttr('style');
                object.destroy();
                return undefined;
            }
        },

        setHeaderView: function() {
            var _fn_ = function() {
                var primaryBanner = $('header > .wrapper');
                if (Modernizr.mq('only screen and (max-width: 768px)')) {
                    primaryBanner.css({
                        height: $window.outerHeight() - $('#download-bar').eq(0).height() - primaryBanner.offset().top
                    });
                } else {
                    primaryBanner.removeAttr('style');
                }
            }
            $window.on('resize', _fn_);
            _fn_();
        },

        skewObject: function(selector, actualSize, direction, recalc, position) {
            var _fn_ = function() {
                var $rzObj = $(selector);
                var ratio = 1;
                if(direction == 'width') {
                    var thisWidth = $window.outerWidth();
                    if(thisWidth < actualSize) {
                        ratio = thisWidth/actualSize;
                    }
                }else {
                    if(direction == 'height') {
                        var thisHeight = $window.outerHeight();
                        if(thisHeight < actualSize) {
                            ratio = thisHeight/actualSize;
                        }
                    }
                }
                resizeObject($rzObj, ratio);

                function resizeObject($rzObj, lastRatio) {
                    var pos = position == '' ? '0 0' : position;
                    $rzObj.css({
                        'transform': 'scale(' + lastRatio + ')',
                        '-webkit-transform-origin': pos,
                        '-moz-transform-origin': pos,
                        '-ms-transform-origin': pos,
                        '-o-transform-origin': pos,
                        'transform-origin': pos,
                    });
                    if(recalc) {
                        // $rzObj.parent().css('width', $rzObj.outerWidth() * lastRatio + 'px');
                        $rzObj.parent().css('height', $rzObj.outerHeight() * lastRatio + 'px');
                        console.log('scale', selector)
                    }
                }
            }
            $window.on('resize', _fn_);
            _fn_();
        },

        contentCssAction: function (selector) {
            // alert("ádfsdaf");
            // CONTENT CSS TAB
            selector = selector !== undefined ?  selector : '';
            if ($(selector + ' #tabHeader').length > 0) {
                var tabArray = $(selector + ' #tabHeader li a');
                // console.log(tabArray);
                tabArray.eq(0).addClass('active');
                $(selector + ' .tab__detail').eq(0).fadeIn(100);

                tabArray.on('click', function () {
                    tabArray.removeClass('active');
                    $(this).addClass('active');
                    $(selector + ' .tab__detail').hide();
                    var curId = $(this).data('href');
                    $(selector + ' ' + curId).fadeIn(100);
                    return false;
                });

            }

            // CONTENT CSS MENU
            $(selector + ' #menu-function').on('click', function() {
                 $(selector + ' .menu-dropdown').toggle('active');
            });
            $(document).on('click', function() {
                $(selector + ' #list-function').removeClass('active');
            });
            
            // CLOSE POPUP
            $(selector + ' .PopupClose').on('click', function() {
                $(this).closest('div').css('display', 'none');
            });
        },

        autoDetectLinkInstall: function (selector) {
            if($(selector).attr("href")!=='#' && $(selector).attr("href")!=='' && $(selector).attr("href")!== undefined) {

            }else {
                var Ios = $("#getLinkIos").attr("href")==undefined ? $(selector).attr("href") : $("#getLinkIos").attr("href");
                var Android = $("#getLinkAndroid").attr("href")==undefined ? $(selector).attr("href") : $("#getLinkAndroid").attr("href");
                if (DnDMoM.autoDetectOsiOS()) {
                    $(selector).attr({
                        'href': Ios,
                        'onclick' : "ga('send', 'event', 'Download-Mobile-Ios', 'Button Image', 'Homepage', 1);"
                    });
                    
                } else if (DnDMoM.autoDetectOsAndroid()) {
                    $(selector).attr({
                        'href' : Android,
                        'onclick': "ga('send', 'event', 'Download-Mobile-Android', 'Button Image', 'Homepage', 1);"
                    });
                }
            }
        },
        autoDetectOsAndroid: function() {
            return navigator.userAgent.match(/Android/i);
        },
        autoDetectOsBlackBerry: function() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        autoDetectOsiOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        autoDetectOsOpera: function() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        autoDetectOsDesktop: function() {
            return navigator.userAgent.match(/Windows NT/i);
        },
        autoDetectOsWindows: function() {
            return navigator.userAgent.match(/IEMobile/i);
        },
        autoDetectOsany: function() {
            return (autoDetectOsAndroid() || autoDetectOsBlackBerry() || autoDetectOsiOS() || autoDetectOsOpera() || autoDetectOsDesktop() || autoDetectOsWindows());
        },

    }
})(jQuery);
//pattern
Pattern.Mediator.installTo(DnDMoM);


