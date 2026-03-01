/**
    *   Load More Results v1.0.0
    * Author: Cenk Çalgan
    * 
    * Options:
    * - tag (object):
    *       - name (string)
    *       - class (string)
    * - displayedItems (int)
    *   - showItems (int)
    * - button (object):
    *       - class (string)
    *       - text (string)
*/
(function ($) {
    'use strict';
    $.fn.loadMoreResults = function (options) {
        var defaults = {
            tag: {
                'name': 'tt',
                'class': 'tt-at'
            },
            displayedItems: 5,
            showItems: 5,
            button: {
                'class': 'btn-load-more',
                text: 'Load More'
            }
        };
        var opts = $.extend(true, {}, defaults, options);
        var alphaNumRE = /^[A-Za-z][-_A-Za-z0-9]+$/;
        var numRE = /^[0-9]+$/;
        $.each(opts, function validateOptions(key, val) {
            if (key === 'tag') {
                formatCheck(key, val, 'name', 'string');
                formatCheck(key, val, 'class', 'string');
            }
            if (key === 'displayedItems') {
                formatCheck(key, val, null, 'number');
            }
            if (key === 'showItems') {
                formatCheck(key, val, null, 'number');
            }
            if (key === 'button') {
                formatCheck(key, val, 'class', 'string');
            }
        });
        function formatCheck(key, val, prop, typ) {
            if (prop !== null && typeof prop !== 'object') {
                if (typeof val[prop] !== typ || String(val[prop]).match(typ == 'string' ? alphaNumRE : numRE) === null) {
                    opts[key][prop] = defaults[key][prop];
                }
            } else {
                if (typeof val !== typ || String(val).match(typ == 'string' ? alphaNumRE : numRE) === null) {
                    opts[key] = defaults[key];
                }
            }
        };
        return this.each(function (index, element) {
            var $list = $(element),
                    lc = $list.find(' > ' + opts.tag.name + '.' + opts.tag.class).length,
                    dc = parseInt(opts.displayedItems),
                    sc = parseInt(opts.showItems);
            if(lc > 10){
                $list.find(' > ' + opts.tag.name + '.' + opts.tag.class + ':lt(' + dc + ')');
                $list.find(' > ' + opts.tag.name + '.' + opts.tag.class + ':gt(' + (dc - 1) + ')').css("display", "none");
                $('.loadactor').append('<tt><a href="javascript:void(0)" class="Button normal btn-view ' + opts.button.class + '">' + opts.button.text + '</a></tt>');
                $list.parent().on("click", ".btn-view", function (e) {
                    e.preventDefault();
                    dc = (dc + sc <= lc) ? dc + sc : lc;
                    $list.find(' > ' + opts.tag.name + '.' + opts.tag.class + ':lt(' + dc + ')').fadeIn();
                    if (dc == lc) {
                        $(this).hide();
                    }
                }); 
            }
        });
    };
})(jQuery);
jQuery(document).ready(function($){
    var templateUrl = object_name.templateUrl;

    $(document).on('click', '.rtg', function(event) {
        event.preventDefault();
        var ide = $(this).attr('tab');
        $('.rtg').addClass('inactive').removeClass('active');
        $(this).addClass('active').removeClass('inactive');
        $('.lrt').removeClass('active');
        $('#' + ide).addClass('active');
    });

    
    $('body').click(function(evt){    
        if(evt.target.id == "res-sj")
          return;
        if(evt.target.id  == 'res-sj_h')
            return;
       //For descendants of menu_content being clicked, remove this check if you do not want to put constraint on descendants.
       if($(evt.target).closest('#res-sj').length)
          return;   
        if($(evt.target).closest('#res-sj_h').length)
          return;  
        $('#res-sj').empty().removeClass('on').hide();         
        $('#res-sj_h').empty().removeClass('on').hide();         
      //Do processing of click event here for every element except with id menu_content
    });
    /* TAB VIDEOS */
    $('.aa-tbs-video a').on('click', function(event) {
        event.preventDefault();
        $('.video-player iframe').removeAttr('src');
        var ide = $(this).attr('href');
        var datas = $(ide).find('iframe').data('src');
        $(ide).find('iframe').attr('src', datas);
    });
    /*ADD TO FAVORITE*/
    $('body').on('click', '#add-to-favorito', function(event) {
        event.preventDefault();
        var $this = $(this);
        var post_id = $(this).data('id'),
            status  = $(this).attr('data-status');
        $('#mdl-favorites .anm-b').empty();
        $.ajax({
            url         : torofilm_Public.url,
            method      : 'POST',
            data        : {
                action      : 'action_add_favorito',
                post_id     : post_id,
                status      : status
            }, 
            success: function( data ) {
                if(status == 'favorito') {
                    $this.find('i').addClass('far');
                    $this.attr('data-status', 'nofavorito');
                    $('#mdl-favorites .anm-b').append('<p class="msg-w"><i class="fa-exclamation-circle"></i>'+torofilm_Public.remove_favorite+'</p>');
                } else if(status == 'nofavorito') {
                    $this.find('i').removeClass('far');
                    $this.attr('data-status', 'favorito');
                    $('#mdl-favorites .anm-b').append('<p class="msg-s"><i class="fa-check-circle"></i>'+torofilm_Public.add_favorite+'</p>');
                }
                setTimeout(()=>{
                    $('.msg-s').remove();
                    $('.msg-w').remove();
                    $('body').removeClass('mdl-on');
                    $('#mdl-favorites').removeClass('on');
                }, 1000);
            }
        });
    });
    $('body').on('click', '#add-to-favorito-s', function(event) {
        event.preventDefault();
        var $this = $(this);
        var post_id = $(this).data('id'),
            status  = $(this).attr('data-status');
        $('#mdl-favorites .anm-b').empty();
        $.ajax({
            url         : torofilm_Public.url,
            method      : 'POST',
            data        : {
                action      : 'action_add_favorito_s',
                post_id     : post_id,
                status      : status
            }, 
            success: function( data ) {
                if(status == 'favorito') {
                    $this.find('i').addClass('far');
                    $this.attr('data-status', 'nofavorito');
                    $('#mdl-favorites .anm-b').append('<p class="msg-w"><i class="fa-exclamation-circle"></i>'+torofilm_Public.remove_favorite+'</p>');
                } else if(status == 'nofavorito') {
                    $this.find('i').removeClass('far');
                    $this.attr('data-status', 'favorito');
                    $('#mdl-favorites .anm-b').append('<p class="msg-s"><i class="fa-check-circle"></i>'+torofilm_Public.add_favorite+'</p>');
                }
                setTimeout(()=>{
                    $('.msg-s').remove();
                    $('.msg-w').remove();
                    $('body').removeClass('mdl-on');
                    $('#mdl-favorites').removeClass('on');
                }, 1000);
            }
        });
    });
    /* TABS AJAX */
    $('.ax-tbs a').on('click', function(e) {
        var $this = $(this),
            limit = $(this).data('limit'),
            post  = $(this).data('post'),
            cate  = $(this).data('category'),
            mode  = $(this).data('mode'),
            ide   = $(this).attr('href');
        if($(ide).find('ul').length != 0 ) {
            return;
        }
        $.ajax({
            url     : torofilm_Public.url,
            method     : 'POST',
            data     : {
                action: 'action_tr_movie_category',
                limit : limit,
                post  : post,
                cate  : cate,
                mode  : mode 
            }, 
            beforeSend: function(){
                if($(ide).find('ul').length == 0 || $(ide).find('p').length==0) {
                    var html = '<div style="width:100%; display:flex; justify-content:center"><i id="sl-home" class="fas fa-spinner"></i></div>';
                    $(ide).append(html);
                }
            },
            success: function( data ) {
                $(ide).html(data);
            }
        });
    });
   /*Responsive*/
    //$('.user-bx').clone().prependTo('#menu').addClass('shw hddc');
    /*Dropdown*/
    $('.aa-drp').each(function() {
        var $AADrpdwn = $(this);
        $('.aa-lnk', $AADrpdwn).click(function(e){
          e.preventDefault();
          $AADrpdDv = $('.aa-cnt', $AADrpdwn);
          $AADrpdDv.parent('.aa-drp').toggleClass('on');
          $('.aa-cnt').not($AADrpdDv).parent('.aa-drp').removeClass('on');
          return false;
        });
    });
    $(document).on('click', function(e){
        if ($(e.target).closest('.aa-cnt').length === 0) {
            $('.aa-cnt').parent('.aa-drp').removeClass('on');
        }
    });
    /*Toggle*/
    $('.aa-tgl').on('click', function(){
        var shwhdd = $(this).attr('data-tgl');
        $('#'+shwhdd).toggleClass('on');
        $(this).toggleClass('on');
    });
    /*Modal*/


    /* Trailer */
    $('.aa-mdl').on('click', function(){
        var shwhddb = $(this).attr('data-mdl');
        $('#'+shwhddb).toggleClass('on');
        $('body').toggleClass('mdl-on');
        $(this).toggleClass('on');

        if( $('#mdl-trailer').hasClass('on') ){
            $('.video-trailer').html(torofilm_Public.trailer);
        } else {
            $('.video-trailer').empty();
        }

    });


    $(document).keyup(function(e){
        if (e.keyCode === 27) {
            $('body').removeClass('mdl-on');
            $('.mdl').removeClass('on');
        }
    });
    /*Accordion*/
    $('.aa-crd').find('.aa-crd-lnk').click(function(){
        $(this).toggleClass('on');
        $('.aa-crd-lnk').not($(this)).removeClass('on');
    });
    /*Tabs*/
    $('.aa-tbs a').click(function(e){
        if($(this).parent().parent().hasClass('cat-t')) {
            return;
        }
      e.preventDefault();
        var $this = $(this),
            tabgroup = '#'+$this.parents('.aa-tbs').data('tbs'),
            others = $this.closest('li').siblings().children('a'),
            target = $this.attr('href');
        others.removeClass('on');
        $this.addClass('on');
        $(tabgroup).children().removeClass('on');
        $(target).addClass('on');
    });
    /*Slider*/
    $('.slider').owlCarousel({
        loop:false,
        margin:32,
        items:1
    });
    /*Carousel*/
    $('.carousel').owlCarousel({
        loop:false,
        margin:8,
        nav:false,
        dots:true,
        navText: ["<i class='fa-chevron-left'></i>","<i class='fa-chevron-right'></i>"],
        responsive:{
            0:{
                items:2
            },
            576:{
                items:3
            },
            768:{
                items:4
            },
            1200:{
                items:6,
                dots:false,
                nav:true
            },
            1600:{
                items:8,
                dots:false,
                nav:true
            }
        }
    });
    /*Input*/
    $('input, textarea').each(function() {
        $(this).on('focus', function() {
            $(this).parent().addClass('on');
        });
        $(this).on('blur', function() {
            if ($(this).val().length == 0) {
                $(this).parent().removeClass('on');
            }
        });
        if ($(this).val() != '') $(this).parent().addClass('on');
    });
    /*Buscador Sugerido*/
    $('#tr_live_search').on('keyup', function(event) {
        var $this = $(this);
        jQuery(this).attr('autocomplete','off');
        var searchTerm = $(this).val();
        if (searchTerm.length > 2){
            $.ajax({
                url     : torofilm_Public.url,
                type    : 'POST',
                data: {
                    action  : 'action_tr_search_suggest',
                    nonce   : torofilm_Public.nonce,
                    term    : searchTerm
                },
                beforeSend: function(){
                    $('#sl-home').removeClass('fa-search').addClass('fas').addClass('fa-spinner').addClass('fa-pulse');
                    $('#res-sj').empty();
                    $this.next().next().removeClass('on');
                },
                success:function(data){
                    $('#sl-home').addClass('fa-search').removeClass('fas').removeClass('fa-spinner').removeClass('fa-pulse');
                    $this.next().next().fadeIn().html(data);
                    $this.next().next().addClass('on');
                },
                error: function(){
                    $('#sl-home').addClass('fa-search').removeClass('fas').removeClass('fa-spinner').removeClass('fa-pulse');
                    $this.next().next().removeClass('on');
                    $this.next().next().hide();
                }
            });
        } else {
            $('#res-sj').empty();
            $this.next().next().removeClass('on');
            $this.next().next().hide();
        }
    }).keyup();
    /*BUSCCDOR SUGERIDO MORE LOAD*/
    $('body').on('click', '#more-shm', function(event) {
        event.preventDefault();
        $('#form-shs').submit();
    });
    /*Buscador Sugerido*/
    $('#tr_live_search_h').on('keyup', function(event) {
        var $this = $(this);
        jQuery(this).attr('autocomplete','off');
        var searchTerm = $(this).val();
        if (searchTerm.length > 2){
            $.ajax({
                url     : torofilm_Public.url,
                type    : 'POST',
                data: {
                    action  : 'action_tr_search_suggest_h',
                    nonce   : torofilm_Public.nonce,
                    term    : searchTerm
                },
                beforeSend: function(){
                    $('#sl-home_h').removeClass('fa-search').addClass('fas').addClass('fa-spinner').addClass('fa-pulse');
                    $('#res-sj_h').empty();
                    $this.next().next().removeClass('on');
                },
                success:function(data){
                    $('#sl-home_h').addClass('fa-search').removeClass('fas').removeClass('fa-spinner').removeClass('fa-pulse');
                    $this.next().next().fadeIn().html(data);
                    $this.next().next().addClass('on');
                },
                error: function(){
                    $('#sl-home_h').addClass('fa-search').removeClass('fas').removeClass('fa-spinner').removeClass('fa-pulse');
                    $this.next().next().removeClass('on');
                    $this.next().next().hide();
                }
            });
        } else {
            $('#res-sj_h').empty();
            $this.next().next().removeClass('on');
            $this.next().next().hide();
        }
    }).keyup();
    /*BUSCCDOR SUGERIDO MORE LOAD*/
    $('body').on('click', '#more-shm-h', function(event) {
        event.preventDefault();
        $('#search').submit();
    });
    /**
     * Formulario Login Header
     * @since 1.0.0
     */
    $('#form-login-user').on('submit', function(event) {
        event.preventDefault();
        var name = $('#form-login-name').val(),
            pass = $('#form-login-pass').val();
        $('.error-login').remove();
        $.ajax({
            url         : torofilm_Public.url,
            method      : 'POST',
            dataType    : 'json',
            data        : {
                action      : 'action_peli_login_header',
                name        : name,
                pass        : pass
            }, 
            success: function( data ) {
                if(data.error == 'false') {
                    location.reload();
                } else {
                    $('#form-login-user .mdl-bd').append('<p class="error-login">Access error</p>');
                }
            },
            error: function(data){
               //Ocurrió un error
                $('#form-login-user .mdl-bd').append('<p class="error-login">'+ torofilm_Public.access_error +'</p>');
            },
        });
    });
    /**
     * Formulario Register Header
     * @since 1.0.0
     */
    $('#form-register-user').on('submit', function(event) {
        event.preventDefault();
        var name = $('#form-register-names').val(),
            pass = $('#form-register-passs').val(),
            email = $('#form-register-emails').val();
        $.ajax({
            url         : torofilm_Public.url,
            method      : 'POST',
            dataType    : 'json',
            data        : {
                action      : 'action_peli_register_header',
                name        : name,
                pass        : pass,
                email       : email
            }, 
            success: function( data ) {
                if(data.error == 'false') {
                    setTimeout(function(){ 
                        $.ajax({
                            url     : torofilm_Public.url,
                            method     : 'POST',
                            dataType    : 'json',
                            data     : {
                                action      : 'action_peli_login_header',
                                name        : name,
                                pass        : pass
                            }, 
                            success: function( data ) {
                                if(data.error == 'false') {
                                    location.reload();
                                }
                            }
                        });
                    }, 500);
                }
            },
            error: function(data){
            },
        });
    });
    if($("#edit-user-perfil-pais").length > 0) {
        $("#edit-user-perfil-pais").countrySelect({
            // onlyCountries: ['us', 'gb', 'ch', 'ca', 'do'],
            // responsiveDropdown: true,
            preferredCountries: ['pe', 'mx', 'ar', 'co', 'cl', 'ec', 'es', 'bo', 'uy', 'py'],
        });
    }
    /*EDITOR DE PERIL DE USER*/
    $('#editor-user-perfil').on('submit', function(e) {
        e.preventDefault();
        var formData = new FormData($('#editor-user-perfil')[0]);
        $.ajax
        ({
            type       : 'POST',
            url        : templateUrl + '/helpers/edit-author.php',
            dataType   : 'json',
            data       : formData,
            cache      : false,
            contentType: false,
            processData: false
        })
        .done(function(data){
            var html = '';
            if(data.mensaje == 'error_image'){
                html += '<p id="msg-alert-confirmation" style="margin-top: 10px;" class="msg-w"><i class="fa-check-circle"></i>'+torofilm_Public.warning+'</p>';
            } else {
                html += '<p id="msg-alert-confirmation" style="margin-top: 10px;" class="msg-s"><i class="fa-check-circle"></i>'+torofilm_Public.saved+'</p>';
            }
            $('#editor-user-perfil').append(html);
            setTimeout(function(){ 
                $('#msg-alert-confirmation').fadeOut(500);
            }, 2000);
            setTimeout(function(){ 
                $('#msg-alert-confirmation').remove();
            }, 2600);
        })
        .fail(function(data){
             var html = '';
            html += '<p id="msg-alert-confirmation" style="margin-top: 10px;" class="msg-w"><i class="fa-check-circle"></i>'+torofilm_Public.error_upload+'</p>';
            $('#editor-user-perfil').append(html);
            setTimeout(function(){ 
                $('#msg-alert-confirmation').fadeOut(500);
            }, 2000);
            setTimeout(function(){ 
                $('#msg-alert-confirmation').remove();
            }, 2600);
        })
    });
    $('#editor-user-pass').on('submit', function(event) {
        event.preventDefault();
        var pass        = $('#editor-user-pass-password').val(),
            passRepeat  = $('#editor-user-pass-repeat').val();
        if( pass == '' && passRepeat == '') {
            return;
        }
        if( pass !== passRepeat ) {
            var html = '';
            html += '<p id="error-tpt" style="margin-top: 10px;" class="msg-d"><i class="fa-exclamation-triangle"></i> Las contraseñas no coinciden</p>';
            $('#editor-user-pass').append(html);
            setTimeout(function(){ 
                $('#error-tpt').fadeOut(500);
            }, 2000);
            setTimeout(function(){ 
                $('#error-tpt').remove();
            }, 2600);
            return;
        }
        $.ajax({
            url     : torofilm_Public.url,
            method     : 'POST',
            data     : {
                action    : 'action_editor_user_perfil',
                pass      : pass,
                passRepeat: passRepeat
            }, 
            success: function( data ) {
                var html = '';
                html += '<p id="msg-alert-confirmation" style="margin-top: 10px;" class="msg-s"><i class="fa-exclamation-circle"></i>Datos guardados correctamente</p>';
                $('#editor-user-pass').append(html);
                setTimeout(function(){ 
                    $('#msg-alert-confirmation').fadeOut(500);
                }, 2000);
                setTimeout(function(){ 
                    $('#msg-alert-confirmation').remove();
                }, 2600);
            }
        });
    });
    $('.sel-temp a').on('click', function(event) {
        event.preventDefault();
        var $this = $(this);
        var text_season = $(this).attr('data-season');
        var post = $(this).attr('data-post');
        $('.n_s').text(text_season);

        // Store selected season in localStorage for this specific series
        try {
            localStorage.setItem('lastSeasonSelected_' + post, text_season);
        } catch(e) {
            // localStorage not available, continue without saving
        }

        // Clear all episode containers and separators
        $('#episode_by_temp').empty();
        $('#episode_by_temp_non_dubbed').remove();
        $('.episodes-separator').remove();

        $this.parent().parent().parent().removeClass('on');
        $.ajax({
            url     : torofilm_Public.url + '?action=action_select_season&season=' + text_season + '&post=' + post,
            method     : 'GET',
            cache      : true,
            beforeSend: function(){
                var html = '<li style="flex:100%; max-width: 100%;"><div style="width:100%; display:flex; justify-content:center"><i id="sl-home" class="fas fa-spinner"></i></div></li>';
                $('#episode_by_temp').append(html);
            },
            success: function( data ) {
                $('#episode_by_temp').html(data);
            }
        });
    });
    $('.loadactor').loadMoreResults({
        displayedItems: 10,
        showItems: 10,
        button: {
          'text': 'View more',
          'class': 'abt'
        },
        tag: {
            'name': 'tt',
            'class': 'tt-at'
        }
    });
    
    /* INFINITE SCROLL */
    var TorofilmInfiniteScroll = {
        loading: false,
        currentPage: 1,
        maxPages: 1,
        container: null,
        loader: null,
        
        init: function() {
            // Check if we're on a page with pagination
            if ($('.navigation.pagination').length === 0) return;
            
            // Don't run infinite scroll on single pages
            if ($('body').hasClass('wp-singular')) return;
            
            // Determine container based on page type
            // For category pages and others, find the visible/active container
            if ($('#movies-a.on ul.post-lst').length) {
                this.container = $('#movies-a.on ul.post-lst').last();
            } else if ($('.post-lst.news-lst').length) {
                // Special case for news layout in categories
                this.container = $('.post-lst.news-lst').last();
            } else if ($('.post-lst').length) {
                this.container = $('.post-lst').last();
            } else if ($('#movies-a ul').length) {
                this.container = $('#movies-a ul').last();
            } else {
                return;
            }
            
            // Get max pages from pagination with multiple fallback methods
            var lastPageLink = $('.pagination a:not(.prev):not(.next):last');
            if (lastPageLink.length) {
                this.maxPages = parseInt(lastPageLink.text());
            }
            
            // Fallback: look for any numbered pagination links
            if (!this.maxPages || isNaN(this.maxPages)) {
                var allPageLinks = $('.pagination a').filter(function() {
                    return /^\d+$/.test($(this).text());
                });
                if (allPageLinks.length) {
                    var numbers = allPageLinks.map(function() {
                        return parseInt($(this).text());
                    }).get();
                    this.maxPages = Math.max.apply(Math, numbers);
                }
            }
            
            // Ultimate fallback: assume at least 2 pages if pagination exists
            if (!this.maxPages || isNaN(this.maxPages)) {
                this.maxPages = 2;
            }
            
            // Get current page
            var currentPageEl = $('.pagination .page-link.current');
            if (currentPageEl.length) {
                this.currentPage = parseInt(currentPageEl.text());
            }
            
            // Create loader element
            this.createLoader();
            
            // Hide original pagination
            $('.navigation.pagination').addClass('infinite-scroll-hidden');
            
            // Bind scroll event
            $(window).on('scroll', this.checkScroll.bind(this));
            
            // Auto-load content if page is too short (no scrollbar)
            // Multiple checks with different timings to catch all scenarios
            setTimeout(function() { this.forceLoadIfShort(); }.bind(this), 500);
            setTimeout(function() { this.forceLoadIfShort(); }.bind(this), 1500);
            setTimeout(function() { this.forceLoadIfShort(); }.bind(this), 3000);
        },
        
        createLoader: function() {
            this.loader = $('<div class="infinite-scroll-loader" style="text-align: center; padding: 40px 0; display: none;">' +
                          '<i class="fas fa-spinner fa-pulse" style="font-size: 2em; color: var(--primary);"></i>' +
                          '</div>');
            this.container.parent().append(this.loader);
        },
        
        forceLoadIfShort: function() {
            // Aggressive auto-loading for short pages
            if (this.loading || this.currentPage >= this.maxPages) return;
            
            var canScroll = $(document).height() > $(window).height() + 200;
            var hasContent = this.container.children().length;
            
            // If we can't scroll properly, force load more content
            if (!canScroll && this.currentPage < this.maxPages) {
                this.loadNextPage();
            }
        },
        
        
        checkScroll: function() {
            if (this.loading || this.currentPage >= this.maxPages) return;
            
            var scrollPosition = $(window).scrollTop() + $(window).height();
            var triggerPosition = $(document).height() - 800;
            
            if (scrollPosition > triggerPosition) {
                this.loadNextPage();
            }
        },
        
        getQueryData: function() {
            var data = {
                action: 'torofilm_infinite_scroll',
                page: this.currentPage + 1,
                per_page: torofilm_Public.posts_per_page || 10
            };
            
            // Detect query type based on body classes and URL
            var bodyClasses = $('body').attr('class');
            var currentUrl = window.location.pathname;
            
            
            // Check for letter pages first (URL pattern: /letter/A, /letter/B, etc.)
            if (currentUrl.includes('/letter/')) {
                data.query_type = 'letters';
                data.query_args = {
                    letter: currentUrl.split('/').filter(Boolean).pop()
                };
            }
            // Check for category first (since category pages also have 'archive' class)
            else if (bodyClasses.indexOf('category') !== -1 && bodyClasses.indexOf('category-') !== -1) {
                data.query_type = 'category';
                var catId = $('body').attr('class').match(/category-(\d+)/);
                
                if (catId) {
                    data.query_args = {
                        cat: catId[1]
                    };
                    
                    // Check URL parameters for post type filter
                    var urlParams = new URLSearchParams(window.location.search);
                    var typeParam = urlParams.get('type');
                    
                    if (typeParam) {
                        data.query_args.post_type = typeParam;
                    }
                } else {
                    // Alternative method: try to get category ID from tab links
                    var catLink = $('.aa-tbs.cat-t a[data-category]').first();
                    if (catLink.length) {
                        var categoryId = catLink.attr('data-category');
                        
                        if (categoryId) {
                            data.query_args = {
                                cat: categoryId
                            };
                            
                            // Check URL parameters for post type filter
                            var urlParams = new URLSearchParams(window.location.search);
                            var typeParam = urlParams.get('type');
                            
                            if (typeParam) {
                                data.query_args.post_type = typeParam;
                            }
                        }
                    }
                }
            } else if (bodyClasses.indexOf('archive') !== -1) {
                if (bodyClasses.indexOf('post-type-archive-movies') !== -1) {
                    data.query_type = 'archive';
                    data.post_type = 'movies';
                } else if (bodyClasses.indexOf('post-type-archive-series') !== -1) {
                    data.query_type = 'archive';
                    data.post_type = 'series';
                }
            } else if (bodyClasses.indexOf('search') !== -1) {
                data.query_type = 'search';
                data.query_args = {
                    s: new URLSearchParams(window.location.search).get('s') || ''
                };
            } else if (bodyClasses.indexOf('tax-') !== -1) {
                var taxMatch = bodyClasses.match(/tax-([a-z_]+)/);
                if (taxMatch && taxMatch[1] === 'letters') {
                    data.query_type = 'letters';
                    data.query_args = {
                        letter: currentUrl.split('/').filter(Boolean).pop()
                    };
                } else {
                    data.query_type = 'taxonomy';
                    if (taxMatch) {
                        data.query_args = {
                            taxonomy: taxMatch[1],
                            term: currentUrl.split('/').filter(Boolean).pop()
                        };
                    }
                }
            } else if (bodyClasses.indexOf('page-template-page-movies') !== -1) {
                data.query_type = 'archive';
                data.post_type = 'movies';
            } else if (bodyClasses.indexOf('page-template-page-series') !== -1) {
                data.query_type = 'archive';
                data.post_type = 'series';
            } else if (bodyClasses.indexOf('page-template-page-language') !== -1) {
                data.query_type = 'language';
                data.query_args = {
                    language: 'english'
                };
            } else if (bodyClasses.indexOf('page-template-page-estrenos') !== -1) {
                data.query_type = 'premieres';
            }
            
            // If no query type detected, try to infer from URL or default to archive
            if (!data.query_type) {
                // Check if we're on a custom post type archive
                if (currentUrl.includes('/movies')) {
                    data.query_type = 'archive';
                    data.post_type = 'movies';
                } else if (currentUrl.includes('/series')) {
                    data.query_type = 'archive';
                    data.post_type = 'series';
                } else {
                    // Default fallback
                    data.query_type = 'archive';
                    data.post_type = 'post';
                }
            }
            
            return data;
        },
        
        loadNextPage: function() {
            this.loading = true;
            this.loader.show();
            
            var queryData = this.getQueryData();
            
            
            $.ajax({
                url: torofilm_Public.url,
                type: 'POST',
                data: queryData,
                success: function(response) {
                    
                    if (response.success && response.data.content) {
                        // Append new content
                        this.container.append(response.data.content);
                        
                        // Update current page
                        this.currentPage++;
                        
                        // Check if there are more pages
                        if (!response.data.has_more || this.currentPage >= this.maxPages) {
                            $(window).off('scroll', this.checkScroll);
                            this.loader.html('<p style="color: var(--tertiary);">' + torofilm_Public.no_more_posts + '</p>');
                        } else {
                            this.loader.hide();
                            // Check if we still need more content (for tall screens)
                            setTimeout(function() {
                                this.forceLoadIfShort();
                            }.bind(this), 100);
                        }
                    }
                    this.loading = false;
                }.bind(this),
                error: function() {
                    this.loading = false;
                    this.loader.hide();
                    $(window).off('scroll', this.checkScroll);
                }.bind(this)
            });
        }
    };
    
    // Initialize infinite scroll
    TorofilmInfiniteScroll.init();
    /*changue link modal register login*/
    $('#to-register').on('click', function(event) {
        event.preventDefault();
        $('.mdl').removeClass('on');
        $('#mdl-signup').addClass('on');
    });
    $('#to-login').on('click', function(event) {
        event.preventDefault();
        $('.mdl').removeClass('on');
        $('#mdl-login').addClass('on');
    });
    $('#playback').on('click', function(event) {
        event.preventDefault();
        if (this.dataset.href !== undefined) {
            if (this.dataset.target !== undefined) {
                window.open(this.dataset.href, 'blank');
            } else {
                window.location = this.dataset.href;
            }
        }
        var count = 0;
        var interval = setInterval(function() {
            count++;
            if (count == 5) {
                $('#playback-time').html('Loading...');
                var $tgt = $(event.target.parentNode);
                $tgt.show().delay(0).fadeOut();
                clearInterval(interval);
            } else {
                $('#playback-time').html(5 - count + ' Loading player...');
            }
        }, 1000);
    });
});
/*!
 * headroom.js v0.5.0 - Give your page some headroom. Hide your header until you need it
 * Copyright (c) 2014 Nick Williams - http://wicky.nillia.ms/headroom.js
 * License: MIT
 */
!function(a,b){"use strict";function c(a){this.callback=a,this.ticking=!1}function d(a){if(arguments.length<=0)throw new Error("Missing arguments in extend function");var b,c,e=a||{};for(c=1;c<arguments.length;c++){var f=arguments[c]||{};for(b in f)e[b]="object"==typeof e[b]?d(e[b],f[b]):e[b]||f[b]}return e}function e(a,b){b=d(b,e.options),this.lastKnownScrollY=0,this.elem=a,this.debouncer=new c(this.update.bind(this)),this.tolerance=b.tolerance,this.classes=b.classes,this.offset=b.offset,this.initialised=!1,this.onPin=b.onPin,this.onUnpin=b.onUnpin,this.onTop=b.onTop,this.onNotTop=b.onNotTop}var f={bind:!!function(){}.bind,classList:"classList"in b.documentElement,rAF:!!(a.requestAnimationFrame||a.webkitRequestAnimationFrame||a.mozRequestAnimationFrame)};a.requestAnimationFrame=a.requestAnimationFrame||a.webkitRequestAnimationFrame||a.mozRequestAnimationFrame,c.prototype={constructor:c,update:function(){this.callback&&this.callback(),this.ticking=!1},requestTick:function(){this.ticking||(requestAnimationFrame(this.rafCallback||(this.rafCallback=this.update.bind(this))),this.ticking=!0)},handleEvent:function(){this.requestTick()}},e.prototype={constructor:e,init:function(){return e.cutsTheMustard?(this.elem.classList.add(this.classes.initial),setTimeout(this.attachEvent.bind(this),100),this):void 0},destroy:function(){var b=this.classes;this.initialised=!1,a.removeEventListener("scroll",this.debouncer,!1),this.elem.classList.remove(b.unpinned,b.pinned,b.top,b.initial)},attachEvent:function(){this.initialised||(this.lastKnownScrollY=this.getScrollY(),this.initialised=!0,a.addEventListener("scroll",this.debouncer,!1),this.debouncer.handleEvent())},unpin:function(){var a=this.elem.classList,b=this.classes;(a.contains(b.pinned)||!a.contains(b.unpinned))&&(a.add(b.unpinned),a.remove(b.pinned),this.onUnpin&&this.onUnpin.call(this))},pin:function(){var a=this.elem.classList,b=this.classes;a.contains(b.unpinned)&&(a.remove(b.unpinned),a.add(b.pinned),this.onPin&&this.onPin.call(this))},top:function(){var a=this.elem.classList,b=this.classes;a.contains(b.top)||(a.add(b.top),a.remove(b.notTop),this.onTop&&this.onTop.call(this))},notTop:function(){var a=this.elem.classList,b=this.classes;a.contains(b.notTop)||(a.add(b.notTop),a.remove(b.top),this.onNotTop&&this.onNotTop.call(this))},getScrollY:function(){return void 0!==a.pageYOffset?a.pageYOffset:(b.documentElement||b.body.parentNode||b.body).scrollTop},getViewportHeight:function(){return a.innerHeight||b.documentElement.clientHeight||b.body.clientHeight},getDocumentHeight:function(){var a=b.body,c=b.documentElement;return Math.max(a.scrollHeight,c.scrollHeight,a.offsetHeight,c.offsetHeight,a.clientHeight,c.clientHeight)},isOutOfBounds:function(a){var b=0>a,c=a+this.getViewportHeight()>this.getDocumentHeight();return b||c},toleranceExceeded:function(a){return Math.abs(a-this.lastKnownScrollY)>=this.tolerance},shouldUnpin:function(a,b){var c=a>this.lastKnownScrollY,d=a>=this.offset;return c&&d&&b},shouldPin:function(a,b){var c=a<this.lastKnownScrollY,d=a<=this.offset;return c&&b||d},update:function(){var a=this.getScrollY(),b=this.toleranceExceeded(a);this.isOutOfBounds(a)||(a<=this.offset?this.top():this.notTop(),this.shouldUnpin(a,b)?this.unpin():this.shouldPin(a,b)&&this.pin(),this.lastKnownScrollY=a)}},e.options={tolerance:0,offset:0,classes:{pinned:"headroom--pinned",unpinned:"headroom--unpinned",top:"headroom--top",notTop:"headroom--not-top",initial:"headroom"}},e.cutsTheMustard="undefined"!=typeof f&&f.rAF&&f.bind&&f.classList,a.Headroom=e}(window,document);
(function() {
    new Headroom(document.querySelector(".hd"), {
        tolerance: 10,
        offset : 205,
        classes: {
          initial: "pfx",
          pinned: "pfxa",
          unpinned: "pfxb"
        }
    }).init();
}());

// Textbox-Style Comments Functionality for All Posts/Pages
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure all elements are rendered
    setTimeout(function() {
        // Check for textbox-comments container
        const textboxContainer = document.querySelector('.textbox-comments');
        if (!textboxContainer) {
            return;
        }

        let commentsExpanded = false;
        let replyingTo = null;

        // Expand comments function
        function expandComments() {
            const trigger = document.getElementById('comments-trigger');
            const expanded = document.getElementById('comments-expanded');
        
            if (!commentsExpanded && trigger && expanded) {
                trigger.style.display = 'none';
                expanded.style.display = 'block';
                expanded.style.opacity = '0';
                setTimeout(() => {
                    expanded.style.opacity = '1';
                }, 10);
                
                commentsExpanded = true;
            }
        }

        // Collapse comments function
        function collapseComments() {
            const trigger = document.getElementById('comments-trigger');
            const expanded = document.getElementById('comments-expanded');
            
            if (trigger && expanded) {
                expanded.style.opacity = '0';
                setTimeout(() => {
                    expanded.style.display = 'none';
                    trigger.style.display = 'block';
                    commentsExpanded = false;
                }, 200);
            }
        }

        // Reply to comment function
        function replyToComment(commentId, authorName) {
            replyingTo = { id: commentId, name: authorName };
            
            // Show reply indicator
            const replyIndicator = document.getElementById('reply-indicator');
            const replyToName = document.getElementById('reply-to-name');
            
            if (replyIndicator && replyToName) {
                replyToName.textContent = authorName;
                replyIndicator.classList.add('show');
            }
            
            // Update textarea placeholder
            const textarea = document.getElementById('comment');
            if (textarea) {
                textarea.placeholder = 'Reply to ' + authorName + '...';
            }
            
            // Expand comments if not already expanded
            if (!commentsExpanded) {
                expandComments();
            } else {
                // Focus textarea if already expanded
                setTimeout(() => {
                    if (textarea) textarea.focus();
                }, 100);
            }
        }

        // Cancel reply function
        function cancelReply() {
            replyingTo = null;
            
            // Hide reply indicator
            const replyIndicator = document.getElementById('reply-indicator');
            if (replyIndicator) {
                replyIndicator.classList.remove('show');
            }
            
            // Reset textarea placeholder
            const textarea = document.getElementById('comment');
            if (textarea) {
                textarea.placeholder = 'Add a comment...';
            }
        }

        // Hide success message function
        function hideSuccessMessage() {
            const successMessage = document.getElementById('comment-success');
            if (successMessage) {
                successMessage.classList.remove('show');
            }
        }

        // Attach event listeners
        const commentsTrigger = document.getElementById('comments-trigger');
        if (commentsTrigger) {
            commentsTrigger.addEventListener('click', expandComments);
            commentsTrigger.style.cursor = 'pointer';
            commentsTrigger.title = 'Click to expand comments';
        }

        const cancelReplyBtn = document.getElementById('cancel-reply-btn');
        if (cancelReplyBtn) {
            cancelReplyBtn.addEventListener('click', cancelReply);
        }

        const collapseBtn = document.getElementById('collapse-comments-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', collapseComments);
        }

        const closeSuccessBtn = document.getElementById('close-success-btn');
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', hideSuccessMessage);
        }

        // Handle form submission with AJAX
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevent default WordPress submission
                
                // Get form data
                const formData = new FormData(commentForm);
                
                // Show loading state
                const submitBtn = commentForm.querySelector('.submit-comment');
                const originalText = submitBtn.value;
                submitBtn.value = 'Posting...';
                submitBtn.disabled = true;
                
                // Submit via AJAX
                fetch(commentForm.action, {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    // Reset button
                    submitBtn.value = originalText;
                    submitBtn.disabled = false;
                    
                    if (response.ok) {
                        // Show success message
                        const successMessage = document.getElementById('comment-success');
                        if (successMessage) {
                            successMessage.classList.add('show');
                        }
                        
                        // Clear form
                        commentForm.reset();
                        
                        // Cancel reply if active
                        cancelReply();
                        
                        // Reset textarea placeholder
                        const textarea = document.getElementById('comment');
                        if (textarea) {
                            textarea.placeholder = 'Add a comment...';
                        }
                        
                        // Scroll to success message
                        if (successMessage) {
                            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        // Handle error
                        alert('Error submitting comment. Please try again.');
                    }
                })
                .catch(error => {
                    // Reset button and show error
                    submitBtn.value = originalText;
                    submitBtn.disabled = false;
                    alert('Error submitting comment. Please try again.');
                });
            });
        }

        // Auto-expand if there's a hash link to comments
        if (window.location.hash && window.location.hash.indexOf('#comment') !== -1) {
            setTimeout(expandComments, 500);
        }

        // Handle comment reply links
        const replyLinks = document.querySelectorAll('.reply-link');
        replyLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const commentId = this.getAttribute('data-comment-id');
                const author = this.getAttribute('data-author');
                if (commentId && author) {
                    replyToComment(commentId, author);
                }
            });
        });
    }, 100); // 100ms delay
});