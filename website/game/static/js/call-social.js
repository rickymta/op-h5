function initAllFbSocial(link) {
    var linkFanpage = link !== undefined ? link : 'https://www.facebook.com/facebook'; //for test purpose
    var webgame = 0;
    
    // like on download bar
    if($('#fb-placeholder-likeOnly').length > 0) {
        $('#fb-placeholder-likeOnly').append(fbHtmlGen(linkFanpage, 'button_count', 'like', false ,false));
    }

    // like share in floating right
    if($('#fb-placeholder-likeRight').length > 0) {
        $('#fb-placeholder-likeRight').append(fbHtmlGen(linkFanpage, 'box_count', 'like', false ,true));
    }

    // like share with text -  use in each article (2 type : fixed bar or bottom artice)
    if($('#fb-placeholder-inpage').length > 0) {
        $('#fb-placeholder-inpage').append(fbHtmlGen(linkFanpage, 'button_count', 'like', false ,true));
        if(webgame) {
            var barPosition = $('#fb-placeholder-inpage').offset().top;
            $('#fb-placeholder-inpage')
                .addClass('fixed-bar')
                .prepend('<div class="qstn">Bài viết này có hữu ích với bạn không?</div>');
            
            $(window).on('scroll', function() {
                if($(window).scrollTop() >= barPosition){
                    $('#fb-placeholder-inpage').css('position', 'fixed');
                }else {
                    $('#fb-placeholder-inpage').css('position', 'relative');
                }
            });
        }
    }

    // Block Fanpage
    if($('#fb-placeholder-fanpage').length > 0) {
        $('#fb-placeholder-fanpage').append(fbHtmlGenPage(linkFanpage, 'timeline', 'false', 'true'));
    }

    // Block Ho tro
    if($('#fb-placeholder-message').length > 0) {
        $('#fb-placeholder-message').append(fbHtmlGenPage(linkFanpage, 'messages', 'true', 'false'));
    }
}


function fbHtmlGen(link, layout, action, showFace, hasShare) {
    return fbLikeShareInpage = 
    '<div class="fb-like" data-href="' + link + '" data-layout="' + layout + '" data-action="' + action + '" data-size="small" data-show-faces="' + showFace + '" data-share="' + hasShare + '"></div>';
}

function fbHtmlGenPage(link, tab, header, showFace ) { //timeline, messages
	return fanpage = 
	'<div class="fb-page" data-href="' + link + '" data-tabs="' + tab +'" data-small-header="' + header + '" data-adapt-container-width="true" data-hide-cover="false" data-show-facepile="' + showFace + '"><blockquote cite="' + link + '" class="fb-xfbml-parse-ignore"><a href="' + link + '">Fanpage</a></blockquote></div>';
}

// <div class="fb-page" data-href="https://www.facebook.com/GunboundM.vng" data-tabs="messages" data-width="252" data-height="300" data-small-header="true" data-adapt-container-width="true" data-hide-cover="true" data-show-facepile="false"><blockquote cite="https://www.facebook.com/GunboundM.vng" class="fb-xfbml-parse-ignore"><a href="https://www.facebook.com/GunboundM.vng">GunBound M - VNG</a></blockquote></div>