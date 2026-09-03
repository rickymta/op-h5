(function( $ ) {
    $.fn.activeMenu = function(options) {
        var settings = $.extend({
            classActive: 'active',
            objActive: 'a',
            exceptSection: ""
        }, options );        

        var navObject = this;
        var linkArray = navObject.find("a");
        var path      = window.location.pathname.replace('/app_dev.php/','').replace('/app_dev.php','');
        var pathArray = path.charAt(0)=='/'? path.substring(1,path.length).split( '/' ):path.split( '/' );        
        var objActive = null;       
      

        function compare(strUrl) {

            linkArray.each(function(el) {

                var $this = $(this);
                var _urlArray = $this.attr("href").replace(domain+'/','').split( '/' ).toString();                
               
                if(_urlArray.search(strUrl) >-1) {                       

                    objActive = $this ;

                    if($this.parent('li').has( "a" ).length == 0) {

                        return false;    
                    }
                    
                }
               

            });
        }
        //in case homepage not index.html
        if(pathArray.length == 1 ) {
            if(settings.objActive=='a') {
                navObject.find('li').eq(0).children('a').addClass(settings.classActive);
            }else {
                navObject.find('li').eq(0).addClass(settings.classActive);
            }
            return this;
        }
               
        if(pathArray.length > 0) {
            var sizePath = pathArray.length  ;
            var arrSection = settings.exceptSection.split( ',' );
            for (i = 0; i < sizePath; i++) {
                var tmp = pathArray.slice(0, sizePath - i).toString(); 

                if((i == sizePath-1) && arrSection.indexOf(tmp) > -1 ) {
                    break;
                }
                compare(tmp); //so sanh url voi href trong tag A

                if(objActive!=null) {   
                    if(settings.objActive=='a') {
                        objActive.addClass(settings.classActive);
                        objActive.parents('li').children('a').addClass(settings.classActive);
                    }else {
                        objActive.parent('li').addClass(settings.classActive);
                        objActive.parents('li').addClass(settings.classActive);
                    }
                    objActive.parents('li').addClass('open')
                    break;
                }
            }
        }

        return this;
    };



}( jQuery ));
