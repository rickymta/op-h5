$(document).ready(function(e) {
    var $body = $('body');

    //Auto detect link or not
    DnDMoM.autoDetectLinkInstall('.app-install-caidat a');


    //init main navigation sub-menu behavior
    DnDMoM.initMainNav();
    DnDMoM.searchFieldAction();

    //init to top button behavior
    DnDMoM.initTopButton();


    // Block right Download action
    $('#floating-right-bar').on('click', function() {
       $(this).toggleClass('focus');
    });

    $(".floating-right-bar *").click(function(evt) {
        evt.stopPropagation();
    });
    $(window).on('scroll', function(){
        if($(window).scrollTop() > 700) {
            $("#floating-right-bar").addClass('focus');
        }else {
            $("#floating-right-bar").removeClass('focus');
        }
    });


    $('[data-fancybox]').fancybox({
        media : {
          youtube : {
            params : {
              autoplay : 1,
              mute: 1
            }
          }
        }
    });

    // initAllFbSocial('https://www.facebook.com/daichien.zing.vn/');
    initAllFbSocial();


    //init events banner slider, Character slide on homepage
    if ($body.hasClass('homepage')) {
        // Resize theo man hinh thiet bi
        DnDMoM.setHeaderView();
        DnDMoM.initPopup('.fancybox');

        // Tao banner even
        if($('#event-banner .swiper-container').length!=0) {
            // var space = Modernizr.mq('screen and (max-width: 1024px)') == true ? 20 : 0;
            var eventBanner = new Swiper('#event-banner .swiper-container', {
                autoplay: {
                    delay: 6000,
                },
                speed: 600,
                slidesPerView: 'auto',
                centeredSlides: true,
                // spaceBetween: space,
                spaceBetween: 20,
                effect: 'slide',//"slide", "fade", "cube", "coverflow" or "flip"
                // autoHeight: true
                disableOnInteraction: true,
                // autoplayDisableOnInteraction:true,
                preventClicks: false,
                navigation: {
                    nextEl: '#event-banner .swiper-button-next',
                    prevEl: '#event-banner .swiper-button-prev',
                },
                pagination: {
                    el: '#event-banner .swiper-pagination',
                    type: 'bullets',
                    clickable: true
                },
            });
        };

        // Tao banner Gallery
        $('#gallery-flipster').flipster({
            spacing: -0.5,
            // nav: false,
            buttons: true,
            // start: 'center',
            // loop: true,
            fadeIn: 400,
            autoplay: true,
            pauseOnHover: true,
            itemContainer:'ul',
            itemSelector:'li',
            style:'carousel', 
            start:0,
            enableKeyboard:false, 
            enableMousewheel:   false, 
            enableTouch: false,
            enableNavButtons:true,
        });

        $('#gallery-flipster-mobile').flipster({
            spacing: -0.5,
            // nav: false,
            buttons: true,
            // start: 'center',
            // loop: true,
            fadeIn: 400,
            autoplay: true,
            pauseOnHover: true,
            itemContainer:'ul',
            itemSelector:'li',
            style:'carousel',
            start:0,
            enableKeyboard:false, 
            enableMousewheel:   false, 
            enableTouch: false,
            enableNavButtons:true,
        });

        if(Modernizr.mq('screen and (max-width: 1024px)')){
            
            DnDMoM.skewObject('#gallery-mobile .wrapper', 768, 'width', 1, 'left top');
var characterTop = new Swiper('.character-top', {
    spaceBetween: 40,
    initialSlide: 2,
    navigation: {
      nextEl: '#character-mobile .swiper-button-next',
      prevEl: '#character-mobile .swiper-button-prev',
    },
  });
  var characterThumbs = new Swiper('.character-thumbs', {
    spaceBetween: 40,
    initialSlide: 2,
    centeredSlides: true,
    slidesPerView: 'auto',
    touchRatio: 0.2,
    slideToClickedSlide: true,
 on: {
    init: function () {
        console.log('on init')
        setTimeout(function() {
            DnDMoM.skewObject('#character-mobile .wrapper', 768, 'width', 1, 'left top');
            $('#character-mobile ').addClass('no-overlay');
            setTimeout(function() {
                $('.character-thumbs .swiper-wrapper').css('transform','translate3d(0px, 0px, 0px)')
                $('.character-thumbs').addClass('no-overlay');
            }, 3000) 
        }, 5000) 
          
    },
  },
    
  });
  characterTop.controller.control = characterThumbs;
  characterThumbs.controller.control = characterTop;
}


        //box ho tro fb
        $('.box-hotro .tabbar').on('click', function(){
            $(this).parent().toggleClass('active');
        });


    };

    if($body.hasClass('subpage')) {
        DnDMoM.contentCssAction();
    };
});


