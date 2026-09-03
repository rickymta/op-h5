// JavaScript Document
$(document).ready(function(){
	//Character Home Action
	if($('#character').length > 0) {
		showContentX(0);
	}
	// click on big tab
	$('#character .character-tabs li a').on('click', function(){
		var posi = $(this).parent('li').index();
		showContentX(posi);
	});
	// click on small tab
	$('#character .character-content .quoc-gia-tab li a').on('click', function(){
		var posii = $(this).parent('li').index() + 1;
		var $parentContain = $($(this).parents('div'));
		// active tren tab lon
		$($parentContain.find('.quoc-gia-tab li a')).removeClass('active');
		$(this).addClass('active');

		// active noi dung lon
		$($parentContain.find('.quoc-gia-content > div')).removeClass('active');
		$($parentContain.find('.quoc-gia-content > div:nth-child('+posii+')')).addClass('active');
	});

	function showContentX(index) {
		var $bigTab = $('#character .character-tabs li');
		var $bigContent = $('#character .character-content > div');

		$bigTab.find('a').removeClass('active');
		$($bigTab.get(index)).children('a').addClass('active');
		$bigContent.removeClass('active');
		$($bigContent.get(index)).addClass('active');

		//small tab
		$($bigContent.get(index)).find('.quoc-gia-tab li a').removeClass('active');
		$($bigContent.get(index)).find('.quoc-gia-tab li:nth-child(1) a').addClass('active');
		$($bigContent).find('.quoc-gia-content > div').removeClass('active');
		$($bigContent.get(index)).find('.quoc-gia-content > div:nth-child(1)').addClass('active');
	}
})

