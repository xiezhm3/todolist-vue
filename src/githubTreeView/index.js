// ==UserScript==
// @name         Github tree view
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Github tree view
// @author       Haley Wang
// @match        https://github.com/*
// @require      https://code.jquery.com/jquery-latest.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.5/jstree.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery.pjax/2.0.1/jquery.pjax.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';


    // Your code here...
    var $ = jQuery;

    var baseUrl = $(".repohead-details-container strong a").attr('href');
    if (!baseUrl) {
        return;
    }
    var branch = $(".branch-select-menu button .css-truncate-target").text();
    var pullUrl = baseUrl + "/pull/new/" + branch;
    var url = pullUrl.replace('/pull/new/', '/');
    var gitTreeUrl = pullUrl.replace('/pull/new/', '/git/trees/');
    var blobUrl = pullUrl.replace('/pull/new/', '/blob/');
    var GH_PJAX_CONTAINER_SEL = '#js-repo-pjax-container, .context-loader-container, [data-pjax-container]';

    console.log('url', url);
    console.log('pullUrl', pullUrl);
    console.log('gitTreeUrl', gitTreeUrl);

    var myHtml = getMyHtml();
    $("body").append(myHtml);
    blindEvent();
    showNavByFlag();
    loadNavData(loadNavDataCB);

    function getTree(data, root, idStr, pidStr, pushStr) {
        var idTxt = idStr || 'id';
        var pidTxt = pidStr || 'pId';
        var pushTxt = pushStr || 'children';
        // 递归方法
        function getNode(id) {
            var node = []
            for (var i = 0; i < data.length; i++) {
                if (data[i][pidTxt] == id) {
                    var children = getNode(data[i][idTxt]);
                    data[i][pushTxt] = children;
                    if (!children) {
                        data[i].icon = 'jstree-file iconfont icon-form';
                        data[i].a_attr = {
                            "href": blobUrl + '/' + data[i].path
                        };
                    } else {
                        //icono-folder
                        data[i].icon = 'iconfont icon-folder';
                    }
                    node.push(data[i])
                }
            }
            if (node.length == 0) {
                return
            } else {
                return node
            }
        }
        // 使用根节点
        return getNode(root)
    }

    //haley:translateData
    function translateData(nodesData) {
        var treeFlatData = nodesData.tree;
        for (var i = 0, n = treeFlatData.length; i < n; i++) {
            var flatItem = treeFlatData[i];
            var path = flatItem.path;
            flatItem.id = path;
            var fileArr = path.split('/');

            flatItem.text = fileArr[fileArr.length - 1];
            if (fileArr.length == 1) {
                flatItem.pId = "/"
            } else {
                flatItem.pId = path.substring(0, path.lastIndexOf('/'))
            }

        }

        var treeData = getTree(treeFlatData, "/");
        console.log('treeData', treeData);
        return treeData;
    }


    //******cache begin
    function getNavDataFromStorage(key) {
        removeNavDateOutOfTime();
        var data = localStorage[key];
        if (!data) {
            return null;
        }
        try {
            return JSON.parse(data);

        } catch (e) {
            console.log(e);
            return null;
        }
    }

    Array.prototype.contains = function(obj) {
        var i = this.length;
        while (i--) {
            if (this[i] === obj) {
                return true;
            }
        }
        return false;
    }

    function addNavKeyAndTime(nav_keys, key) {
        nav_keys.unshift(key)

        var nav_keys_time = localStorage['nav_keys_time'];
        nav_keys_time = nav_keys_time ? JSON.parse(nav_keys_time) : {};
        nav_keys_time[key] = new Date().getTime();
        localStorage['nav_keys_time'] = JSON.stringify(nav_keys_time);
    }

    function syncNavKeyAndTime() {
        var nav_keys_time = localStorage['nav_keys_time'];
        nav_keys_time = nav_keys_time ? JSON.parse(nav_keys_time) : {};
        var nav_keys = localStorage['cache_keys'];
        nav_keys = nav_keys ? nav_keys.split(',') : [];
        var newKey = {};
        for (var i = 0; i < nav_keys.length; i++) {
            newKey[nav_keys[i]] = nav_keys_time[nav_keys[i]]
        }

        localStorage['nav_keys_time'] = JSON.stringify(newKey);
    }

    function removeNavDateOutOfTime() {
        var maxTime = 1000 * 60 * 10;
        var nav_keys_time = localStorage['nav_keys_time'];
        nav_keys_time = nav_keys_time ? JSON.parse(nav_keys_time) : {};
        var nav_keys = localStorage['cache_keys'];
        nav_keys = nav_keys ? nav_keys.split(',') : [];
        var newKeyTime = {};
        var nowT = new Date().getTime();
        for (var i = 0; i < nav_keys.length; i++) {
            var time = parseInt(nav_keys_time[nav_keys[i]]);
            if (nowT - time < maxTime) {
                newKeyTime[nav_keys[i]] = nav_keys_time[nav_keys[i]]
            } else {
                localStorage.removeItem(nav_keys[i])
            }
        }
        var newKey = [];
        for (var a in newKeyTime) {
            if (newKeyTime.hasOwnProperty(a)) {
                newKey.push(a);
            }
        }
        localStorage['cache_keys'] = newKey.join(',');

        localStorage['nav_keys_time'] = JSON.stringify(newKeyTime);
    }


    function saveNavDataToStorage(key, json) {
        var maxSize = 3;
        var nav_keys_str = localStorage['cache_keys'];
        var nav_keys = [];

        if (nav_keys_str) {
            nav_keys = nav_keys_str.split(',');
        }!nav_keys.contains(key) && addNavKeyAndTime(nav_keys, key);
        if (nav_keys.length > maxSize) {
            var keyPop = nav_keys.pop();
            localStorage.removeItem(keyPop);
        }
        if (nav_keys.length > maxSize) {
            keyPop = nav_keys.pop();
            localStorage.removeItem(keyPop);
        }

        try {
            localStorage[key] = JSON.stringify(json);

        } catch (e) {
            localStorage.key = '{}';
            console.log(e)
        }
        localStorage['cache_keys'] = nav_keys.join(',');
        syncNavKeyAndTime();
    }
    //******cache end

    //haley : blindEvent
    function blindEvent() {
        $("#oak_s").submit(function(e) {
            e.preventDefault();
            $("#jstree_demo_div").jstree(true).search($("#oak_q").val());
        });

        $('.jstree-leaf .jstree-anchor').on('click', function(obj) {
            console.log(obj);
        });

        $('#jstree_demo_div').bind("activate_node.jstree", function(obj, e) {
            // 获取当前节点
            var currentNode = e.node;
            console.log(currentNode);
            if (currentNode.a_attr.href.length <= 1) {
                return;
            }

            //window.location.href = currentNode.a_attr.href;
            selectFile(currentNode.a_attr.href, {
                $pjaxContainer: GH_PJAX_CONTAINER_SEL
            });
        });

        $("#oak_btn button").click(function() {
            if (!localStorage.show_oak_nav_flag || localStorage.show_oak_nav_flag == "1") {
                $("html").removeClass('show_oak_nav');
                localStorage.show_oak_nav_flag = "0";
            } else {
                $("html").addClass('show_oak_nav');
                localStorage.show_oak_nav_flag = "1";
            }
        });
    }



    var _get = function get(object, property, receiver) {
        if (object === null) {
            object = Function.prototype;
        }
        var desc = Object.getOwnPropertyDescriptor(object, property);
        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);
            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;
            if (getter === undefined) {
                return undefined;
            }
            return getter.call(receiver);
        }
    };

    function selectFile(path, opts) {
        opts = opts || {};
        var $pjaxContainer = opts.$pjaxContainer;

        // if we're on the same page and just navigating to a different anchor
        // don't bother fetching the page with pjax
        var pathWithoutAnchor = path.replace(/#.*$/, '');
        var isSamePage = location.pathname === pathWithoutAnchor;
        var loadWithPjax = $pjaxContainer.length && !isSamePage;

        if (loadWithPjax) {
            $.pjax({
                // needs full path for pjax to work with Firefox as per cross-domain-content setting
                url: location.protocol + '//' + location.host + path,
                container: $pjaxContainer,
                timeout: 0 // global timeout doesn't seem to work, use this instead
            });
        } else {
            _get(Object.getPrototypeOf(PjaxAdapter.prototype), 'selectFile', this).call(this, path);
        }
    }

    /**
     * svg icon
     **/
    (function(window) {
        var svgSprite = '<svg><symbol id="icon-back" viewBox="0 0 1024 1024"><path d="M363.840919 472.978737C336.938714 497.358861 337.301807 537.486138 364.730379 561.486138L673.951902 832.05497C682.818816 839.813519 696.296418 838.915012 704.05497 830.048098 711.813519 821.181184 710.915012 807.703582 702.048098 799.94503L392.826577 529.376198C384.59578 522.174253 384.502227 511.835287 392.492414 504.59418L702.325747 223.807723C711.056111 215.895829 711.719614 202.404616 703.807723 193.674252 695.895829 184.943889 682.404617 184.280386 673.674253 192.192278L363.840919 472.978737Z"  ></path></symbol><symbol id="icon-close" viewBox="0 0 1024 1024"><path d="M176.661601 817.172881C168.472798 825.644055 168.701706 839.149636 177.172881 847.338438 185.644056 855.527241 199.149636 855.298332 207.338438 846.827157L826.005105 206.827157C834.193907 198.355983 833.964998 184.850403 825.493824 176.661601 817.02265 168.472798 803.517069 168.701706 795.328267 177.172881L176.661601 817.172881Z"  ></path><path d="M795.328267 846.827157C803.517069 855.298332 817.02265 855.527241 825.493824 847.338438 833.964998 839.149636 834.193907 825.644055 826.005105 817.172881L207.338438 177.172881C199.149636 168.701706 185.644056 168.472798 177.172881 176.661601 168.701706 184.850403 168.472798 198.355983 176.661601 206.827157L795.328267 846.827157Z"  ></path></symbol><symbol id="icon-form" viewBox="0 0 1024 1024"><path d="M835.55027 48.761905C876.805122 48.761905 910.222223 81.441158 910.222223 121.753604L910.222223 834.966428 917.178886 818.05911 755.401109 982.711731 773.333333 975.238095 188.412988 975.238095C147.247907 975.238095 113.777778 942.409011 113.777778 902.094615L113.777778 24.380952 88.888889 48.761905 835.55027 48.761905ZM64 0 64 24.380952 64 902.094615C64 969.325498 119.742117 1024 188.412988 1024L773.333333 1024 783.922411 1024 791.265557 1016.526364 953.043334 851.873745 960 844.793457 960 834.966428 960 121.753604C960 54.49204 904.277615 0 835.55027 0L88.888889 0 64 0Z"  ></path><path d="M736.080945 707.047618C694.76038 707.047618 661.333333 739.619379 661.333333 780.144186L661.333333 926.47619C661.333333 939.941419 672.476469 950.857143 686.222223 950.857143 699.967977 950.857143 711.11111 939.941419 711.11111 926.47619L711.11111 780.144186C711.11111 766.607861 722.192996 755.809523 736.080945 755.809523L848 755.809523C861.745754 755.809523 872.88889 744.893801 872.88889 731.428572 872.88889 717.963343 861.745754 707.047618 848 707.047618L736.080945 707.047618Z"  ></path><path d="M775.164361 219.428572C788.910114 219.428572 800.05325 208.512847 800.05325 195.047619 800.05325 181.582391 788.910114 170.666667 775.164361 170.666667L263.111111 170.666667C249.365357 170.666667 238.222222 181.582391 238.222222 195.047619 238.222222 208.512847 249.365357 219.428572 263.111111 219.428572L775.164361 219.428572Z"  ></path><path d="M775.164361 365.714285C788.910114 365.714285 800.05325 354.798562 800.05325 341.333333 800.05325 327.868105 788.910114 316.952382 775.164361 316.952382L263.111111 316.952382C249.365357 316.952382 238.222222 327.868105 238.222222 341.333333 238.222222 354.798562 249.365357 365.714285 263.111111 365.714285L775.164361 365.714285Z"  ></path><path d="M775.164361 536.380951C788.910114 536.380951 800.05325 525.465229 800.05325 512 800.05325 498.534771 788.910114 487.619049 775.164361 487.619049L263.111111 487.619049C249.365357 487.619049 238.222222 498.534771 238.222222 512 238.222222 525.465229 249.365357 536.380951 263.111111 536.380951L775.164361 536.380951Z"  ></path></symbol><symbol id="icon-less" viewBox="0 0 1024 1024"><path d="M509.927514 387.159081C517.168621 379.168894 527.507586 379.262447 534.709532 387.493244L805.278364 696.714765C813.036915 705.581679 826.514517 706.480186 835.381431 698.721636 844.248346 690.963085 845.146852 677.485483 837.388303 668.618569L566.819471 359.397045C542.819471 331.968474 502.692194 331.60538 478.31207 358.507586L197.525612 668.340919C189.61372 677.071283 190.277222 690.562496 199.007586 698.474389 207.737949 706.386281 221.229163 705.722778 229.141056 696.992414L509.927514 387.159081Z"  ></path></symbol><symbol id="icon-moreunfold" viewBox="0 0 1024 1024"><path d="M478.31207 644.159081C502.692194 671.061286 542.819471 670.698193 566.819471 643.269621L837.388303 334.048098C845.146852 325.181184 844.248346 311.703582 835.381431 303.94503 826.514517 296.186481 813.036915 297.084988 805.278364 305.951902L534.709532 615.173423C527.507586 623.40422 517.168621 623.497773 509.927514 615.507586L229.141056 305.674253C221.229163 296.943889 207.737949 296.280386 199.007586 304.192277 190.277222 312.104171 189.61372 325.595383 197.525612 334.325747L478.31207 644.159081Z"  ></path></symbol><symbol id="icon-more" viewBox="0 0 1024 1024"><path d="M642.174253 504.59418C650.164439 511.835287 650.070886 522.174253 641.84009 529.376198L332.618569 799.94503C323.751654 807.703582 322.853148 821.181184 330.611697 830.048098 338.370249 838.915012 351.847851 839.813519 360.714765 832.05497L669.936288 561.486138C697.36486 537.486138 697.727953 497.358861 670.825747 472.978737L360.992414 192.192278C352.26205 184.280386 338.770837 184.943889 330.858944 193.674252 322.947053 202.404616 323.610556 215.895829 332.340919 223.807723L642.174253 504.59418Z"  ></path></symbol><symbol id="icon-search" viewBox="0 0 1024 1024"><path d="M1001.526404 991.699618C999.922771 986.822379 999.922771 986.822379 998.661741 984.531443 997.556333 982.547938 996.293839 980.724943 994.702325 978.653549 992.500075 975.787264 989.423708 972.169135 985.358477 967.619563 978.223881 959.634933 967.82403 948.546074 954.04227 934.18551 932.495573 911.733901 910.909628 889.684252 858.479859 836.391998 806.561909 783.619985 784.782022 761.370402 763.425645 739.113463 750.035742 725.158933 739.986204 714.441517 733.331893 706.993367 730.0273 703.294545 727.65239 700.501581 726.365602 698.828322 727.222236 700.438869 727.222236 700.438869 728.57702 704.41879 730.685899 711.913483 730.685899 711.913483 721.610157 729.174018 803.853596 649.91606 851.33145 539.987051 851.33145 422.399774 851.33145 189.11482 665.530044 0 436.332393 0 207.134741 0 21.333333 189.11482 21.333333 422.399774 21.333333 655.684727 207.134741 844.799548 436.332393 844.799548 441.356706 844.799548 446.556279 844.56416 452.347883 844.11767 456.487002 843.798575 460.079727 843.454155 466.651669 842.776804 479.958906 841.405269 484.804847 841.014569 490.397372 841.014558 499.896397 841.014541 514.964663 837.646929 537.39015 831.429666 540.021178 830.700239 542.719546 829.938705 545.476431 829.148403 553.976567 826.711712 562.667765 824.108471 571.097184 821.505798 576.160226 819.942528 580.026436 818.721914 582.233225 818.013231 595.480279 813.759108 602.830912 799.380094 598.651326 785.896804 594.471738 772.413515 580.344653 764.931795 567.097598 769.18592 565.058735 769.840674 561.367413 771.006074 556.494825 772.510539 548.364858 775.020755 539.986116 777.530404 531.839533 779.865745 529.217662 780.617342 526.657771 781.339795 524.170112 782.029476 506.936476 786.807345 493.480702 789.814579 490.397278 789.814586 482.458716 789.814601 476.720548 790.277235 461.583853 791.837329 455.416051 792.473024 452.140828 792.787008 448.548723 793.063932 443.933724 793.419714 439.960704 793.599575 436.332393 793.599575 234.916275 793.599575 71.63625 627.407763 71.63625 422.399774 71.63625 217.391785 234.916275 51.199973 436.332393 51.199973 637.74851 51.199973 801.028533 217.391785 801.028533 422.399774 801.028533 525.775443 759.336083 622.309077 687.025254 691.994987 677.769918 709.563029 677.769918 709.563029 679.976768 717.62707 681.566101 722.305182 681.566101 722.305182 682.808947 724.550298 683.910231 726.511657 685.170219 728.326692 686.754421 730.386692 688.964348 733.260343 692.047349 736.886044 696.115554 741.439575 703.261474 749.437982 713.66454 760.532418 727.438434 774.887134 749.001325 797.359294 770.84669 819.675765 822.916311 872.601946 875.194278 925.7399 896.716879 947.724843 918.057933 969.962174 931.455439 983.922347 941.502012 994.634524 948.144469 1002.068378 951.440527 1005.757135 953.805218 1008.538259 955.077419 1010.194061 954.139053 1008.441707 954.139053 1008.441707 952.75811 1004.249822 950.686453 996.172693 950.686453 996.172693 960.850534 978.849743 950.24269 987.977788 948.913429 1004.130236 957.881542 1014.927251 966.849655 1025.724265 982.719104 1027.077231 993.326948 1017.949188 1003.683753 1000.332838 1003.683753 1000.332838 1001.526404 991.699618Z"  ></path></symbol><symbol id="icon-selected" viewBox="0 0 1024 1024"><path d="M464.247574 677.487844C474.214622 686.649009 489.665824 686.201589 499.086059 676.479029L798.905035 367.037898C808.503379 357.131511 808.253662 341.319801 798.347275 331.721456 788.44089 322.12311 772.62918 322.372828 763.030833 332.279215L463.211858 641.720346 498.050342 640.711531 316.608839 473.940462C306.453341 464.606085 290.653676 465.271736 281.319299 475.427234 271.984922 485.582733 272.650573 501.382398 282.806071 510.716775L464.247574 677.487844Z"  ></path></symbol><symbol id="icon-folder" viewBox="0 0 1228 1024"><path d="M1228.544 306.304a153.6256 153.6256 0 0 0-153.6256-153.9072h-460.032l21.4272 8.7808L481.024 8.96 472.064 0.256H0.9472v863.36c0 85.248 68.6592 154.368 153.2928 154.368h906.4448c16.9472 0 30.72-13.824 30.72-30.8224 0-17.0496-13.7728-30.848-30.72-30.848H154.2144c-50.688 0-91.904-41.4976-91.904-92.672V31.0784l-30.72 30.8224h428.032l-21.4272-8.7552 155.264 152.192 8.9344 8.7552h472.5248a92.1088 92.1088 0 0 1 92.2368 92.2112V849.92c0 17.024 13.7216 30.8224 30.6688 30.8224 16.9728 0 30.72-13.7984 30.72-30.8224V306.304z m-61.3888 172.032l0.2048-61.696H62.4128v61.696h1104.7424z"  ></path></symbol></svg>';
        var script = function() {
                var scripts = document.getElementsByTagName("script");
                return scripts[scripts.length - 1]
            }
            ();
        var shouldInjectCss = script.getAttribute("data-injectcss");
        var ready = function(fn) {
            if (document.addEventListener) {
                if (~["complete", "loaded", "interactive"].indexOf(document.readyState)) {
                    setTimeout(fn, 0)
                } else {
                    var loadFn = function() {
                        document.removeEventListener("DOMContentLoaded", loadFn, false);
                        fn()
                    };
                    document.addEventListener("DOMContentLoaded", loadFn, false)
                }
            } else if (document.attachEvent) {
                IEContentLoaded(window, fn)
            }

            function IEContentLoaded(w, fn) {
                var d = w.document,
                    done = false,
                    init = function() {
                        if (!done) {
                            done = true;
                            fn()
                        }
                    };
                var polling = function() {
                    try {
                        d.documentElement.doScroll("left")
                    } catch (e) {
                        setTimeout(polling, 50);
                        return
                    }
                    init()
                };
                polling();
                d.onreadystatechange = function() {
                    if (d.readyState == "complete") {
                        d.onreadystatechange = null;
                        init()
                    }
                }
            }
        };
        var before = function(el, target) {
            target.parentNode.insertBefore(el, target)
        };
        var prepend = function(el, target) {
            if (target.firstChild) {
                before(el, target.firstChild)
            } else {
                target.appendChild(el)
            }
        };

        function appendSvg() {
            var div,
                svg;
            div = document.createElement("div");
            div.innerHTML = svgSprite;
            svgSprite = null;
            svg = div.getElementsByTagName("svg")[0];
            if (svg) {
                svg.setAttribute("aria-hidden", "true");
                svg.style.position = "absolute";
                svg.style.width = 0;
                svg.style.height = 0;
                svg.style.overflow = "hidden";
                prepend(svg, document.body)
            }
        }
        if (shouldInjectCss && !window.__iconfont__svg__cssinject__) {
            window.__iconfont__svg__cssinject__ = true;
            try {
                document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>")
            } catch (e) {
                console && console.log(e)
            }
        }
        ready(appendSvg)
    })(window)

    /**
     * ### Node Customize plugin
     *
     * Allows to customize nodes when they are drawn.
     */
    /*globals jQuery, define, exports, require */
    (function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define('jstree.node_customize', ['jquery', 'jstree'], factory);
        } else if (typeof exports === 'object') {
            factory(require('jquery'), require('jstree'));
        } else {
            factory(jQuery, jQuery.jstree);
        }
    }(function($, jstree, undefined) {
        "use strict";

        if ($.jstree.plugins.node_customize) {
            return;
        }

        /**
         * the settings object.
         * key is the attribute name to select the customizer function from switch.
         * switch is a key => function(el, node) map.
         * default: function(el, node) will be called if the type could not be mapped
         * @name $.jstree.defaults.node_customize
         * @plugin node_customize
         */
        $.jstree.defaults.node_customize = {
            "key": "type",
            "switch": {},
            "default": null
        };

        $.jstree.plugins.node_customize = function(options, parent) {
            this.redraw_node = function(obj, deep, callback, force_draw) {
                var node_id = obj;
                var el = parent.redraw_node.apply(this, arguments);
                if (el) {
                    var node = this._model.data[node_id];
                    var cfg = this.settings.node_customize;
                    var key = cfg.key;
                    var type = (node && node.original && node.original[key]);
                    var customizer = (type && cfg.switch[type]) || cfg.default;
                    if (customizer)
                        customizer(el, node);
                }
                return el;
            };
        }
    }));

    //haley showNavByFlag
    function showNavByFlag() {
        if (!localStorage.show_oak_nav_flag || localStorage.show_oak_nav_flag == "1") {
            $("html").addClass('show_oak_nav');
        } else {
            $("html").removeClass('show_oak_nav');
        }
    }

    function loadNavDataCB(nodesData) {
        var treeData = translateData(nodesData);
        var jstreeData = {
            "plugins": ["search"],
            'core': {
                'data': treeData
            },
            node_customize: {
                default: function(el, node) {
                    $(el).find('.icon-folder').html(`<svg class="icon" aria-hidden="true"><use xlink:href="#icon-folder"></use></svg>`);
                    $(el).find('.jstree-file').html(`<svg class="icon" aria-hidden="true"><use xlink:href="#icon-form"></use></svg>`);
                    $(el).find('.jstree-ocl').html(`<svg class="icon more" aria-hidden="true"><use xlink:href="#icon-more"></use>
                             </svg>
                             <svg class="icon moreunfold" aria-hidden="true">
                                  <use xlink:href="#icon-moreunfold"></use>
                             </svg>`);
                }
            },
            plugins: ['node_customize', "search"]

        };
        $('#jstree_demo_div').jstree(jstreeData);
        $("#oak-load").hide();
        $("#oak_btn .icon").show();
        $('#oak_s').show();
        $("#oak_btn button").show();

    }

    //haley loadNavData
    function loadNavData(cb) {
        $("#oak-load").show();
        $("#oak_btn button").show();
        $("#oak_btn .icon").hide();

        var nodesDataFromCache = getNavDataFromStorage(gitTreeUrl);
        if (nodesDataFromCache) {
            setTimeout(function() {
                cb(nodesDataFromCache);
            }, 200);

            return;
        }

        $.ajax({
            url: `https://api.github.com/repos${gitTreeUrl}?recursive=1`,
            cache: false,
            success: function(nodesData) {
                cb(nodesData);
                saveNavDataToStorage(gitTreeUrl, nodesData);
            }
        });
    }



    function getMyHtml() {

        return `
<style>

      .icon {
        /* 通过设置 font-size 来改变图标大小 */
        width: 1em; height: 1em;
        /* 图标和文字相邻时，垂直对齐 */
        vertical-align: -0.15em;
        /* 通过设置 color 来改变 SVG 的颜色/fill */
        fill: currentColor;
        /* path 和 stroke 溢出 viewBox 部分在 IE 下会显示
           normalize.css 中也包含这行 */
        overflow: hidden;
      }

  .oak-nav {
      display:none;
  }
  .show_oak_nav {
    margin-left: 232px;
  }

  .show_oak_nav .oak-nav {
      display:block;
  }

  #oak_btn .icon {
     display:none;
  }

.jstree-open .more {
  display:none;
}

.jstree-closed .more {
  display:inline;
}

.jstree-open .moreunfold {
  display:inline;
}

.jstree-closed .moreunfold {
  display:none;
}

.jstree-leaf .moreunfold ,.jstree-leaf .more {
  display:none;
}

#oak_btn {
  top: 14px;
  left: 7px;
  bottom: 0px;
  z-index: 1000002;
position: fixed !important;
width: 50px;
height: 50px;

}

#oak_btn button {
  height: 28px;
}

.oak-nav {
  top: 0px;
  right: 0px;
  left: 0px;
  bottom: 0px;
  z-index: 1000001;
  /*transform: translate3d(-100%, 0px, 0px);*/
  position: fixed !important;
  overflow: visible;
  border-right: 1px solid rgb(221, 221, 221);
  transition: transform 0.2s ease;
  width: 231px;

}
.oak-tree-box {
  position: absolute;
  top: 43px;
  right: 0px;
  left: 0px;
  bottom: 0px;
overflow: auto;

}

#oak_s {
padding: 14px 2px 2px 43px;
display: none;
}

#oak_s input{
  padding: 0;
  min-height: 28px;
}

      .jstree-node,
      .jstree-children,
      .jstree-container-ul {
          display: block;
          margin: 0;
          padding: 0;
          list-style-type: none;
          list-style-image: none
      }

      .jstree-node {
          white-space: nowrap
      }

      .jstree-anchor {
          display: inline-block;
          color: #000;
          white-space: nowrap;
          padding: 0 4px 0 1px;
          margin: 0;
          vertical-align: top
      }

      .jstree-anchor:focus {
          outline: 0
      }

      .jstree-anchor,
      .jstree-anchor:link,
      .jstree-anchor:visited,
      .jstree-anchor:hover,
      .jstree-anchor:active {
          text-decoration: none;
          color: inherit
      }

      .jstree-icon {
          display: inline-block;
          text-decoration: none;
          margin: 0;
          padding: 0;
          vertical-align: top;
          text-align: center
      }

      .jstree-icon:empty {
          display: inline-block;
          text-decoration: none;
          margin: 0;
          padding: 0;
          vertical-align: top;
          text-align: center
      }

      .jstree-ocl {
          cursor: pointer
      }

      .jstree-leaf>.jstree-ocl {
          cursor: default
      }

      .jstree .jstree-open>.jstree-children {
          display: block
      }

      .jstree .jstree-closed>.jstree-children,
      .jstree .jstree-leaf>.jstree-children {
          display: none
      }

      .jstree-anchor>.jstree-themeicon {
          margin-right: 2px
      }

      .jstree-no-icons .jstree-themeicon,
      .jstree-anchor>.jstree-themeicon-hidden {
          display: none
      }

      .jstree-hidden {
          display: none
      }

      .jstree-rtl .jstree-anchor {
          padding: 0 1px 0 4px
      }

      .jstree-rtl .jstree-anchor>.jstree-themeicon {
          margin-left: 2px;
          margin-right: 0
      }

      .jstree-rtl .jstree-node {
          margin-left: 0
      }

      .jstree-rtl .jstree-container-ul>.jstree-node {
          margin-right: 0
      }

      .jstree-wholerow-ul {
          position: relative;
          display: inline-block;
          min-width: 100%
      }

      .jstree-wholerow-ul .jstree-leaf>.jstree-ocl {
          cursor: pointer
      }

      .jstree-wholerow-ul .jstree-anchor,
      .jstree-wholerow-ul .jstree-icon {
          position: relative
      }

      .jstree-wholerow-ul .jstree-wholerow {
          width: 100%;
          cursor: pointer;
          position: absolute;
          left: 0;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none
      }

      .vakata-context {
          display: none
      }

      .vakata-context,
      .vakata-context ul {
          margin: 0;
          padding: 2px;
          position: absolute;
          background: #f5f5f5;
          border: 1px solid #979797;
          box-shadow: 2px 2px 2px #999
      }

      .vakata-context ul {
          list-style: none;
          left: 100%;
          margin-top: -2.7em;
          margin-left: -4px
      }

      .vakata-context .vakata-context-right ul {
          left: auto;
          right: 100%;
          margin-left: auto;
          margin-right: -4px
      }

      .vakata-context li {
          list-style: none;
          display: inline
      }

      .vakata-context li>a {
          display: block;
          padding: 0 2em;
          text-decoration: none;
          width: auto;
          color: #000;
          white-space: nowrap;
          line-height: 2.4em;
          text-shadow: 1px 1px 0 #fff;
          border-radius: 1px
      }

      .vakata-context li>a:hover {
          position: relative;
          background-color: #e8eff7;
          box-shadow: 0 0 2px #0a6aa1
      }

      .vakata-context li>a.vakata-context-parent {
          background-image: url(data:image/gif;base64,R0lGODlhCwAHAIAAACgoKP///yH5BAEAAAEALAAAAAALAAcAAAIORI4JlrqN1oMSnmmZDQUAOw==);
          background-position: right center;
          background-repeat: no-repeat
      }

      .vakata-context li>a:focus {
          outline: 0
      }

      .vakata-context .vakata-context-hover>a {
          position: relative;
          background-color: #e8eff7;
          box-shadow: 0 0 2px #0a6aa1
      }

      .vakata-context .vakata-context-separator>a,
      .vakata-context .vakata-context-separator>a:hover {
          background: #fff;
          border: 0;
          border-top: 1px solid #e2e3e3;
          height: 1px;
          min-height: 1px;
          max-height: 1px;
          padding: 0;
          margin: 0 0 0 2.4em;
          border-left: 1px solid #e0e0e0;
          text-shadow: 0 0 0 transparent;
          box-shadow: 0 0 0 transparent;
          border-radius: 0
      }

      .vakata-context .vakata-contextmenu-disabled a,
      .vakata-context .vakata-contextmenu-disabled a:hover {
          color: silver;
          background-color: transparent;
          border: 0;
          box-shadow: 0 0 0
      }

      .vakata-context li>a>i {
          text-decoration: none;
          display: inline-block;
          width: 2.4em;
          height: 2.4em;
          background: 0 0;
          margin: 0 0 0 -2em;
          vertical-align: top;
          text-align: center;
          line-height: 2.4em
      }

      .vakata-context li>a>i:empty {
          width: 2.4em;
          line-height: 2.4em
      }

      .vakata-context li>a .vakata-contextmenu-sep {
          display: inline-block;
          width: 1px;
          height: 2.4em;
          background: #fff;
          margin: 0 .5em 0 0;
          border-left: 1px solid #e2e3e3
      }

      .vakata-context .vakata-contextmenu-shortcut {
          font-size: .8em;
          color: silver;
          opacity: .5;
          display: none
      }

      .vakata-context-rtl ul {
          left: auto;
          right: 100%;
          margin-left: auto;
          margin-right: -4px
      }

      .vakata-context-rtl li>a.vakata-context-parent {
          background-image: url(data:image/gif;base64,R0lGODlhCwAHAIAAACgoKP///yH5BAEAAAEALAAAAAALAAcAAAINjI+AC7rWHIsPtmoxLAA7);
          background-position: left center;
          background-repeat: no-repeat
      }

      .vakata-context-rtl .vakata-context-separator>a {
          margin: 0 2.4em 0 0;
          border-left: 0;
          border-right: 1px solid #e2e3e3
      }

      .vakata-context-rtl .vakata-context-left ul {
          right: auto;
          left: 100%;
          margin-left: -4px;
          margin-right: auto
      }

      .vakata-context-rtl li>a>i {
          margin: 0 -2em 0 0
      }

      .vakata-context-rtl li>a .vakata-contextmenu-sep {
          margin: 0 0 0 .5em;
          border-left-color: #fff;
          background: #e2e3e3
      }

      #jstree-marker {
          position: absolute;
          top: 0;
          left: 0;
          margin: -5px 0 0 0;
          padding: 0;
          border-right: 0;
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-left: 5px solid;
          width: 0;
          height: 0;
          font-size: 0;
          line-height: 0
      }

      #jstree-dnd {
          line-height: 16px;
          margin: 0;
          padding: 4px
      }

      #jstree-dnd .jstree-icon,
      #jstree-dnd .jstree-copy {
          display: inline-block;
          text-decoration: none;
          margin: 0 2px 0 0;
          padding: 0;
          width: 16px;
          height: 16px
      }

      #jstree-dnd .jstree-ok {
          background: green
      }

      #jstree-dnd .jstree-er {
          background: red
      }

      #jstree-dnd .jstree-copy {
          margin: 0 2px
      }

      .jstree-default .jstree-node,
      .jstree-default .jstree-icon {
          background-repeat: no-repeat;
          background-color: transparent
      }

      .jstree-default .jstree-anchor,
      .jstree-default .jstree-wholerow {
          transition: background-color .15s, box-shadow .15s
      }

      .jstree-default .jstree-hovered {
          background: #e7f4f9;
          border-radius: 2px;
          box-shadow: inset 0 0 1px #ccc
      }

      .jstree-default .jstree-clicked {
          background: #beebff;
          border-radius: 2px;
          box-shadow: inset 0 0 1px #999
      }

      .jstree-default .jstree-no-icons .jstree-anchor>.jstree-themeicon {
          display: none
      }

      .jstree-default .jstree-disabled {
          background: 0 0;
          color: #666
      }

      .jstree-default .jstree-disabled.jstree-hovered {
          background: 0 0;
          box-shadow: none
      }

      .jstree-default .jstree-disabled.jstree-clicked {
          background: #efefef
      }

      .jstree-default .jstree-disabled>.jstree-icon {
          opacity: .8;
          filter: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'jstree-grayscale\'><feColorMatrix type=\'matrix\' values=\'0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0\'/></filter></svg>#jstree-grayscale");
          filter: gray;
          -webkit-filter: grayscale(100%)
      }

      .jstree-default .jstree-search {
          font-style: italic;
          color: #8b0000;
          font-weight: 700
      }

      .jstree-default .jstree-no-checkboxes .jstree-checkbox {
          display: none !important
      }

      .jstree-default.jstree-checkbox-no-clicked .jstree-clicked {
          background: 0 0;
          box-shadow: none
      }

      .jstree-default.jstree-checkbox-no-clicked .jstree-clicked.jstree-hovered {
          background: #e7f4f9
      }

      .jstree-default.jstree-checkbox-no-clicked>.jstree-wholerow-ul .jstree-wholerow-clicked {
          background: 0 0
      }

      .jstree-default.jstree-checkbox-no-clicked>.jstree-wholerow-ul .jstree-wholerow-clicked.jstree-wholerow-hovered {
          background: #e7f4f9
      }

      .jstree-default>.jstree-striped {
          min-width: 100%;
          display: inline-block;
          background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAkCAMAAAB/qqA+AAAABlBMVEUAAAAAAAClZ7nPAAAAAnRSTlMNAMM9s3UAAAAXSURBVHjajcEBAQAAAIKg/H/aCQZ70AUBjAATb6YPDgAAAABJRU5ErkJggg==) left top repeat
      }

      .jstree-default>.jstree-wholerow-ul .jstree-hovered,
      .jstree-default>.jstree-wholerow-ul .jstree-clicked {
          background: 0 0;
          box-shadow: none;
          border-radius: 0
      }

      .jstree-default .jstree-wholerow {
          -moz-box-sizing: border-box;
          -webkit-box-sizing: border-box;
          box-sizing: border-box
      }

      .jstree-default .jstree-wholerow-hovered {
          background: #e7f4f9
      }

      .jstree-default .jstree-wholerow-clicked {
          background: #beebff;
          background: -webkit-linear-gradient(top, #beebff 0, #a8e4ff 100%);
          background: linear-gradient(to bottom, #beebff 0, #a8e4ff 100%)
      }

      .jstree-default .jstree-node {
          min-height: 24px;
          line-height: 24px;
          margin-left: 24px;
          min-width: 24px
      }

      .jstree-default .jstree-anchor {
          line-height: 24px;
          height: 24px
      }

      .jstree-default .jstree-icon {
          width: 24px;
          height: 24px;
          line-height: 24px
      }

      .jstree-default .jstree-icon:empty {
          width: 24px;
          height: 24px;
          line-height: 24px
      }

      .jstree-default.jstree-rtl .jstree-node {
          margin-right: 24px
      }

      .jstree-default .jstree-wholerow {
          height: 24px
      }



      .jstree-default .jstree-node {
          background-position: -292px -4px;
          background-repeat: repeat-y
      }

      .jstree-default .jstree-last {
          background: 0 0
      }

      .jstree-default .jstree-open>.jstree-ocl {
          background-position: -132px -4px
      }

      .jstree-default .jstree-closed>.jstree-ocl {
          background-position: -100px -4px
      }

      .jstree-default .jstree-leaf>.jstree-ocl {
          background-position: -68px -4px
      }

      .jstree-default .jstree-themeicon {
          background-position: -260px -4px
      }

      .jstree-default>.jstree-no-dots .jstree-node,
      .jstree-default>.jstree-no-dots .jstree-leaf>.jstree-ocl {
          background: 0 0
      }

      .jstree-default>.jstree-no-dots .jstree-open>.jstree-ocl {
          background-position: -36px -4px
      }

      .jstree-default>.jstree-no-dots .jstree-closed>.jstree-ocl {
          background-position: -4px -4px
      }

      .jstree-default .jstree-disabled {
          background: 0 0
      }

      .jstree-default .jstree-disabled.jstree-hovered {
          background: 0 0
      }

      .jstree-default .jstree-disabled.jstree-clicked {
          background: #efefef
      }

      .jstree-default .jstree-checkbox {
          background-position: -164px -4px
      }

      .jstree-default .jstree-checkbox:hover {
          background-position: -164px -36px
      }

      .jstree-default.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox,
      .jstree-default .jstree-checked>.jstree-checkbox {
          background-position: -228px -4px
      }

      .jstree-default.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox:hover,
      .jstree-default .jstree-checked>.jstree-checkbox:hover {
          background-position: -228px -36px
      }

      .jstree-default .jstree-anchor>.jstree-undetermined {
          background-position: -196px -4px
      }

      .jstree-default .jstree-anchor>.jstree-undetermined:hover {
          background-position: -196px -36px
      }

      .jstree-default .jstree-checkbox-disabled {
          opacity: .8;
          filter: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'jstree-grayscale\'><feColorMatrix type=\'matrix\' values=\'0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0\'/></filter></svg>#jstree-grayscale");
          filter: gray;
          -webkit-filter: grayscale(100%)
      }

      .jstree-default>.jstree-striped {
          background-size: auto 48px
      }

      .jstree-default.jstree-rtl .jstree-node {
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAACAQMAAAB49I5GAAAABlBMVEUAAAAdHRvEkCwcAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjAAMOBgAAGAAJMwQHdQAAAABJRU5ErkJggg==);
          background-position: 100% 1px;
          background-repeat: repeat-y
      }

      .jstree-default.jstree-rtl .jstree-last {
          background: 0 0
      }

      .jstree-default.jstree-rtl .jstree-open>.jstree-ocl {
          background-position: -132px -36px
      }

      .jstree-default.jstree-rtl .jstree-closed>.jstree-ocl {
          background-position: -100px -36px
      }

      .jstree-default.jstree-rtl .jstree-leaf>.jstree-ocl {
          background-position: -68px -36px
      }

      .jstree-default.jstree-rtl>.jstree-no-dots .jstree-node,
      .jstree-default.jstree-rtl>.jstree-no-dots .jstree-leaf>.jstree-ocl {
          background: 0 0
      }

      .jstree-default.jstree-rtl>.jstree-no-dots .jstree-open>.jstree-ocl {
          background-position: -36px -36px
      }

      .jstree-default.jstree-rtl>.jstree-no-dots .jstree-closed>.jstree-ocl {
          background-position: -4px -36px
      }

      .jstree-default .jstree-themeicon-custom {
          background-color: transparent;
          background-image: none;
          background-position: 0 0
      }

      .jstree-default>.jstree-container-ul .jstree-loading>.jstree-ocl {
          background: url(throbber.gif) center center no-repeat
      }





      .jstree-default>.jstree-container-ul>.jstree-node {
          margin-left: 0;
          margin-right: 0
      }

      #jstree-dnd.jstree-default {
          line-height: 24px;
          padding: 0 4px
      }



      #jstree-dnd.jstree-default i {
          background: 0 0;
          width: 24px;
          height: 24px;
          line-height: 24px
      }

      #jstree-dnd.jstree-default .jstree-ok {
          background-position: -4px -68px
      }

      #jstree-dnd.jstree-default .jstree-er {
          background-position: -36px -68px
      }

      .jstree-default.jstree-rtl .jstree-node {
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAACAQMAAAB49I5GAAAABlBMVEUAAAAdHRvEkCwcAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjAAMOBgAAGAAJMwQHdQAAAABJRU5ErkJggg==)
      }

      .jstree-default.jstree-rtl .jstree-last {
          background: 0 0
      }

      .jstree-default-small .jstree-node {
          min-height: 18px;
          line-height: 18px;
          margin-left: 18px;
          min-width: 18px
      }

      .jstree-default-small .jstree-anchor {
          line-height: 18px;
          height: 18px
      }

      .jstree-default-small .jstree-icon {
          width: 18px;
          height: 18px;
          line-height: 18px
      }

      .jstree-default-small .jstree-icon:empty {
          width: 18px;
          height: 18px;
          line-height: 18px
      }

      .jstree-default-small.jstree-rtl .jstree-node {
          margin-right: 18px
      }

      .jstree-default-small .jstree-wholerow {
          height: 18px
      }



      .jstree-default-small .jstree-node {
          background-position: -295px -7px;
          background-repeat: repeat-y
      }

      .jstree-default-small .jstree-last {
          background: 0 0
      }

      .jstree-default-small .jstree-open>.jstree-ocl {
          background-position: -135px -7px
      }

      .jstree-default-small .jstree-closed>.jstree-ocl {
          background-position: -103px -7px
      }

      .jstree-default-small .jstree-leaf>.jstree-ocl {
          background-position: -71px -7px
      }

      .jstree-default-small .jstree-themeicon {
          background-position: -263px -7px
      }

      .jstree-default-small>.jstree-no-dots .jstree-node,
      .jstree-default-small>.jstree-no-dots .jstree-leaf>.jstree-ocl {
          background: 0 0
      }

      .jstree-default-small>.jstree-no-dots .jstree-open>.jstree-ocl {
          background-position: -39px -7px
      }

      .jstree-default-small>.jstree-no-dots .jstree-closed>.jstree-ocl {
          background-position: -7px -7px
      }

      .jstree-default-small .jstree-disabled {
          background: 0 0
      }

      .jstree-default-small .jstree-disabled.jstree-hovered {
          background: 0 0
      }

      .jstree-default-small .jstree-disabled.jstree-clicked {
          background: #efefef
      }

      .jstree-default-small .jstree-checkbox {
          background-position: -167px -7px
      }

      .jstree-default-small .jstree-checkbox:hover {
          background-position: -167px -39px
      }

      .jstree-default-small.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox,
      .jstree-default-small .jstree-checked>.jstree-checkbox {
          background-position: -231px -7px
      }

      .jstree-default-small.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox:hover,
      .jstree-default-small .jstree-checked>.jstree-checkbox:hover {
          background-position: -231px -39px
      }

      .jstree-default-small .jstree-anchor>.jstree-undetermined {
          background-position: -199px -7px
      }

      .jstree-default-small .jstree-anchor>.jstree-undetermined:hover {
          background-position: -199px -39px
      }

      .jstree-default-small .jstree-checkbox-disabled {
          opacity: .8;
          filter: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'jstree-grayscale\'><feColorMatrix type=\'matrix\' values=\'0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0\'/></filter></svg>#jstree-grayscale");
          filter: gray;
          -webkit-filter: grayscale(100%)
      }

      .jstree-default-small>.jstree-striped {
          background-size: auto 36px
      }

      .jstree-default-small.jstree-rtl .jstree-node {
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAACAQMAAAB49I5GAAAABlBMVEUAAAAdHRvEkCwcAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjAAMOBgAAGAAJMwQHdQAAAABJRU5ErkJggg==);
          background-position: 100% 1px;
          background-repeat: repeat-y
      }

      .jstree-default-small.jstree-rtl .jstree-last {
          background: 0 0
      }

      .jstree-default-small.jstree-rtl .jstree-open>.jstree-ocl {
          background-position: -135px -39px
      }

      .jstree-default-small.jstree-rtl .jstree-closed>.jstree-ocl {
          background-position: -103px -39px
      }

      .jstree-default-small.jstree-rtl .jstree-leaf>.jstree-ocl {
          background-position: -71px -39px
      }

      .jstree-default-small.jstree-rtl>.jstree-no-dots .jstree-node,
      .jstree-default-small.jstree-rtl>.jstree-no-dots .jstree-leaf>.jstree-ocl {
          background: 0 0
      }

      .jstree-default-small.jstree-rtl>.jstree-no-dots .jstree-open>.jstree-ocl {
          background-position: -39px -39px
      }

      .jstree-default-small.jstree-rtl>.jstree-no-dots .jstree-closed>.jstree-ocl {
          background-position: -7px -39px
      }

      .jstree-default-small .jstree-themeicon-custom {
          background-color: transparent;
          background-image: none;
          background-position: 0 0
      }

      .jstree-default-small>.jstree-container-ul .jstree-loading>.jstree-ocl {
          background: url(throbber.gif) center center no-repeat
      }



      .jstree-default-small>.jstree-container-ul>.jstree-node {
          margin-left: 0;
          margin-right: 0
      }

      #jstree-dnd.jstree-default-small {
          line-height: 18px;
          padding: 0 4px
      }



      #jstree-dnd.jstree-default-small i {
          background: 0 0;
          width: 18px;
          height: 18px;
          line-height: 18px
      }

      #jstree-dnd.jstree-default-small .jstree-ok {
          background-position: -7px -71px
      }

      #jstree-dnd.jstree-default-small .jstree-er {
          background-position: -39px -71px
      }

      .jstree-default-small.jstree-rtl .jstree-node {
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAACAQMAAABv1h6PAAAABlBMVEUAAAAdHRvEkCwcAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjAAMHBgAAiABBI4gz9AAAAABJRU5ErkJggg==)
      }

      .jstree-default-small.jstree-rtl .jstree-last {
          background: 0 0
      }

      .jstree-default-large .jstree-node {
          min-height: 32px;
          line-height: 32px;
          margin-left: 32px;
          min-width: 32px
      }

      .jstree-default-large .jstree-anchor {
          line-height: 32px;
          height: 32px
      }

      .jstree-default-large .jstree-icon {
          width: 32px;
          height: 32px;
          line-height: 32px
      }

      .jstree-default-large .jstree-icon:empty {
          width: 32px;
          height: 32px;
          line-height: 32px
      }

      .jstree-default-large.jstree-rtl .jstree-node {
          margin-right: 32px
      }

      .jstree-default-large .jstree-wholerow {
          height: 32px
      }



      .jstree-default-large .jstree-node {
          background-position: -288px 0;
          background-repeat: repeat-y
      }

      .jstree-default-large .jstree-last {
          background: 0 0
      }

      .jstree-default-large .jstree-open>.jstree-ocl {
          background-position: -128px 0
      }

      .jstree-default-large .jstree-closed>.jstree-ocl {
          background-position: -96px 0
      }

      .jstree-default-large .jstree-leaf>.jstree-ocl {
          background-position: -64px 0
      }

      .jstree-default-large .jstree-themeicon {
          background-position: -256px 0
      }

      .jstree-default-large>.jstree-no-dots .jstree-node,
      .jstree-default-large>.jstree-no-dots .jstree-leaf>.jstree-ocl {
          background: 0 0
      }

      .jstree-default-large>.jstree-no-dots .jstree-open>.jstree-ocl {
          background-position: -32px 0
      }

      .jstree-default-large>.jstree-no-dots .jstree-closed>.jstree-ocl {
          background-position: 0 0
      }

      .jstree-default-large .jstree-disabled {
          background: 0 0
      }

      .jstree-default-large .jstree-disabled.jstree-hovered {
          background: 0 0
      }

      .jstree-default-large .jstree-disabled.jstree-clicked {
          background: #efefef
      }

      .jstree-default-large .jstree-checkbox {
          background-position: -160px 0
      }

      .jstree-default-large .jstree-checkbox:hover {
          background-position: -160px -32px
      }

      .jstree-default-large.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox,
      .jstree-default-large .jstree-checked>.jstree-checkbox {
          background-position: -224px 0
      }

      .jstree-default-large.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox:hover,
      .jstree-default-large .jstree-checked>.jstree-checkbox:hover {
          background-position: -224px -32px
      }

      .jstree-default-large .jstree-anchor>.jstree-undetermined {
          background-position: -192px 0
      }

      .jstree-default-large .jstree-anchor>.jstree-undetermined:hover {
          background-position: -192px -32px
      }

      .jstree-default-large .jstree-checkbox-disabled {
          opacity: .8;
          filter: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'jstree-grayscale\'><feColorMatrix type=\'matrix\' values=\'0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0\'/></filter></svg>#jstree-grayscale");
          filter: gray;
          -webkit-filter: grayscale(100%)
      }

      .jstree-default-large>.jstree-striped {
          background-size: auto 64px
      }

      .jstree-default-large.jstree-rtl .jstree-node {
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAACAQMAAAB49I5GAAAABlBMVEUAAAAdHRvEkCwcAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjAAMOBgAAGAAJMwQHdQAAAABJRU5ErkJggg==);
          background-position: 100% 1px;
          background-repeat: repeat-y
      }

      .jstree-default-large.jstree-rtl .jstree-last {
          background: 0 0
      }

      .jstree-default-large.jstree-rtl .jstree-open>.jstree-ocl {
          background-position: -128px -32px
      }

      .jstree-default-large.jstree-rtl .jstree-closed>.jstree-ocl {
          background-position: -96px -32px
      }

      .jstree-default-large.jstree-rtl .jstree-leaf>.jstree-ocl {
          background-position: -64px -32px
      }

      .jstree-default-large.jstree-rtl>.jstree-no-dots .jstree-node,
      .jstree-default-large.jstree-rtl>.jstree-no-dots .jstree-leaf>.jstree-ocl {
          background: 0 0
      }

      .jstree-default-large.jstree-rtl>.jstree-no-dots .jstree-open>.jstree-ocl {
          background-position: -32px -32px
      }

      .jstree-default-large.jstree-rtl>.jstree-no-dots .jstree-closed>.jstree-ocl {
          background-position: 0 -32px
      }

      .jstree-default-large .jstree-themeicon-custom {
          background-color: transparent;
          background-image: none;
          background-position: 0 0
      }

      .jstree-default-large>.jstree-container-ul .jstree-loading>.jstree-ocl {
          background: url(throbber.gif) center center no-repeat
      }




      .jstree-default-large>.jstree-container-ul>.jstree-node {
          margin-left: 0;
          margin-right: 0
      }

      #jstree-dnd.jstree-default-large {
          line-height: 32px;
          padding: 0 4px
      }



      #jstree-dnd.jstree-default-large i {
          background: 0 0;
          width: 32px;
          height: 32px;
          line-height: 32px
      }

      #jstree-dnd.jstree-default-large .jstree-ok {
          background-position: 0 -64px
      }

      #jstree-dnd.jstree-default-large .jstree-er {
          background-position: -32px -64px
      }

      .jstree-default-large.jstree-rtl .jstree-node {
          background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAACAQMAAAAD0EyKAAAABlBMVEUAAAAdHRvEkCwcAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjgIIGBgABCgCBvVLXcAAAAABJRU5ErkJggg==)
      }

      .jstree-default-large.jstree-rtl .jstree-last {
          background: 0 0
      }

      @media (max-width:768px) {
          #jstree-dnd.jstree-dnd-responsive {
              line-height: 40px;
              font-weight: 700;
              font-size: 1.1em;
              text-shadow: 1px 1px #fff
          }
          #jstree-dnd.jstree-dnd-responsive>i {
              background: 0 0;
              width: 40px;
              height: 40px
          }
          #jstree-dnd.jstree-dnd-responsive>.jstree-ok {
              background-image: url(40px.png);
              background-position: 0 -200px;
              background-size: 120px 240px
          }
          #jstree-dnd.jstree-dnd-responsive>.jstree-er {
              background-image: url(40px.png);
              background-position: -40px -200px;
              background-size: 120px 240px
          }
          #jstree-marker.jstree-dnd-responsive {
              border-left-width: 10px;
              border-top-width: 10px;
              border-bottom-width: 10px;
              margin-top: -10px
          }
      }

      @media (max-width:768px) {
          .jstree-default-responsive .jstree-icon {
              background-image: url(40px.png)
          }
          .jstree-default-responsive .jstree-node,
          .jstree-default-responsive .jstree-leaf>.jstree-ocl {
              background: 0 0
          }
          .jstree-default-responsive .jstree-node {
              min-height: 40px;
              line-height: 40px;
              margin-left: 40px;
              min-width: 40px;
              white-space: nowrap
          }
          .jstree-default-responsive .jstree-anchor {
              line-height: 40px;
              height: 40px
          }
          .jstree-default-responsive .jstree-icon,
          .jstree-default-responsive .jstree-icon:empty {
              width: 40px;
              height: 40px;
              line-height: 40px
          }
          .jstree-default-responsive>.jstree-container-ul>.jstree-node {
              margin-left: 0
          }
          .jstree-default-responsive.jstree-rtl .jstree-node {
              margin-left: 0;
              margin-right: 40px
          }
          .jstree-default-responsive.jstree-rtl .jstree-container-ul>.jstree-node {
              margin-right: 0
          }
          .jstree-default-responsive .jstree-ocl,
          .jstree-default-responsive .jstree-themeicon,
          .jstree-default-responsive .jstree-checkbox {
              background-size: 120px 240px
          }
          .jstree-default-responsive .jstree-leaf>.jstree-ocl {
              background: 0 0
          }
          .jstree-default-responsive .jstree-open>.jstree-ocl {
              background-position: 0 0 !important
          }
          .jstree-default-responsive .jstree-closed>.jstree-ocl {
              background-position: 0 -40px !important
          }
          .jstree-default-responsive.jstree-rtl .jstree-closed>.jstree-ocl {
              background-position: -40px 0 !important
          }
          .jstree-default-responsive .jstree-themeicon {
              background-position: -40px -40px
          }
          .jstree-default-responsive .jstree-checkbox,
          .jstree-default-responsive .jstree-checkbox:hover {
              background-position: -40px -80px
          }
          .jstree-default-responsive.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox,
          .jstree-default-responsive.jstree-checkbox-selection .jstree-clicked>.jstree-checkbox:hover,
          .jstree-default-responsive .jstree-checked>.jstree-checkbox,
          .jstree-default-responsive .jstree-checked>.jstree-checkbox:hover {
              background-position: 0 -80px
          }
          .jstree-default-responsive .jstree-anchor>.jstree-undetermined,
          .jstree-default-responsive .jstree-anchor>.jstree-undetermined:hover {
              background-position: 0 -120px
          }
          .jstree-default-responsive .jstree-anchor {
              font-weight: 700;
              font-size: 1.1em;
              text-shadow: 1px 1px #fff
          }
          .jstree-default-responsive>.jstree-striped {
              background: 0 0
          }
          .jstree-default-responsive .jstree-wholerow {
              border-top: 1px solid rgba(255, 255, 255, .7);
              border-bottom: 1px solid rgba(64, 64, 64, .2);
              background: #ebebeb;
              height: 40px
          }
          .jstree-default-responsive .jstree-wholerow-hovered {
              background: #e7f4f9
          }
          .jstree-default-responsive .jstree-wholerow-clicked {
              background: #beebff
          }
          .jstree-default-responsive .jstree-children .jstree-last>.jstree-wholerow {
              box-shadow: inset 0 -6px 3px -5px #666
          }
          .jstree-default-responsive .jstree-children .jstree-open>.jstree-wholerow {
              box-shadow: inset 0 6px 3px -5px #666;
              border-top: 0
          }
          .jstree-default-responsive .jstree-children .jstree-open+.jstree-open {
              box-shadow: none
          }
          .jstree-default-responsive .jstree-node,
          .jstree-default-responsive .jstree-icon,
          .jstree-default-responsive .jstree-node>.jstree-ocl,
          .jstree-default-responsive .jstree-themeicon,
          .jstree-default-responsive .jstree-checkbox {
              background-image: url(40px.png);
              background-size: 120px 240px
          }
          .jstree-default-responsive .jstree-node {
              background-position: -80px 0;
              background-repeat: repeat-y
          }
          .jstree-default-responsive .jstree-last {
              background: 0 0
          }
          .jstree-default-responsive .jstree-leaf>.jstree-ocl {
              background-position: -40px -120px
          }
          .jstree-default-responsive .jstree-last>.jstree-ocl {
              background-position: -40px -160px
          }
          .jstree-default-responsive .jstree-themeicon-custom {
              background-color: transparent;
              background-image: none;
              background-position: 0 0
          }
          .jstree-default-responsive .jstree-file {
              background: url(40px.png) 0 -160px no-repeat;
              background-size: 120px 240px
          }
          .jstree-default-responsive .jstree-folder {
              background: url(40px.png) -40px -40px no-repeat;
              background-size: 120px 240px
          }
          .jstree-default-responsive>.jstree-container-ul>.jstree-node {
              margin-left: 0;
              margin-right: 0
          }
      }

</style>

  <div id="oak_btn">
      <button class="btn btn-sm" type="button">
          <svg class="icon" aria-hidden="true">
              <use xlink:href="#icon-more"></use>
          </svg>
          <img id="oak-load" src="https://assets-cdn.github.com/images/spinners/octocat-spinner-128.gif" alt="Octocat Spinner Icon" class="" width="18">
      </button>
  </div>
  <nav class="oak-nav">
      <form id="oak_s">
          <input class="form-control" type="search" id="oak_q" />
          <button class="btn btn-sm" type="submit">
              <svg class="icon" aria-hidden="true">
                  <use xlink:href="#icon-search"></use>
              </svg>
          </button>
      </form>

      <div class="oak-tree-box">
          <div id="jstree_demo_div"> </div>
      </div>
  </nav>

          `;

    }
})();