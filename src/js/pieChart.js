var target = d4.select("#chart1");
var width, height, radius ;
var svg = target.append("svg")
.attr('height', '100%').attr('width', '100%')
.append("g");

svg.append("g")
.attr("class", "slices");
svg.append("g")
.attr("class", "labels");
svg.append("g")
.attr("class", "hover-labels");
svg.append("g")
.attr("class", "lines");

var msg = svg.append('text').attr('class','chartMsg')
    .attr('dx','-9')
    .style('text-anchor', 'middle')
    .style('opacity', '0.6')
    .style('font-size','14px')
    .style('font-family', 'var(--font)');
    // .style('font-style', 'italic');

    bounds = target.node().getBoundingClientRect(),
    width = bounds.width ,
    height = bounds.height  ,
    radius = Math.min(width, height) / 2 - 20;


var pie = d4.layout.pie()
.sort(null)
.value(function(d) {
    return d.value;
});

var arc = d4.svg.arc()
.outerRadius(radius * 0.8)
.innerRadius(0);

var outerArc = d4.svg.arc()
.innerRadius(radius * .8)
.outerRadius(radius * .5);


var key = function(d){ return d.data.label; };

var color = d4.scale.ordinal()
.domain(["Allowed", "Blocked"])
.range(["var(--col3)", "#ff6361"]); //#ff6021

resize();
function resize(){
    bounds = target.node().getBoundingClientRect(),
    width = bounds.width ,
    height = bounds.height  ,
    radius = Math.min(width, height) / 2 - 20;

    svg.attr("transform", "translate(" + width / 2 + "," + height / 2  + ")");
    drawData();
}
new ResizeSensor(target.node(), function(){
    resize();
});

var toggle = document.getElementById('toggle-button');
var sessionBlocked , totalBlocked, sessionAllowed, totalAllowed;

function getPieData (){
    chrome.runtime.sendMessage({"what":"get_pie_chart_metrics"},function(response){
        sessionBlocked = response.sessionBlocked;
        sessionAllowed = response.sessionAllowed;
        totalBlocked = response.totalBlocked;
        totalAllowed = response.totalAllowed;
        drawData();
    })
}

function drawData(){
    let blockedData = {};
    let allowedData = {};
    if(toggle.checked){
        blockedData = {label: "Blocked", value : this.sessionBlocked}
        allowedData = {label: "Allowed", value : this.sessionAllowed}
    }
    else{
        blockedData = {label: "Blocked", value : this.totalBlocked}
        allowedData = {label: "Allowed", value : this.totalAllowed}
    }
    change([blockedData,allowedData]);   
}



toggle.addEventListener("click", function(){
    drawData();
})



getPieData();
setInterval(function(){
    getPieData();
},3000);



function change(data) {
    /* ------- Filter out empty data --------- */
    data = data.filter(el => el.value);
    if(Array.isArray(data) && !data.length){
        msg.text("No data");
    }
    else {
        msg.text('');
    }

    /* ------- Reset arcs --------*/
    arc.outerRadius(radius * 0.8);
    outerArc.innerRadius(radius * .8).outerRadius(radius * .5);

    /* ------- PIE SLICES -------*/
    var slice = svg.select(".slices").selectAll("path.slice")
        .data(pie(data), key);

    slice.enter()
        .insert("path")
        .style("fill", function(d) { return color(d.data.label); })
        .attr("class", "slice")
        .on('mouseover', showHoverText)
        .on('mouseout', hideHoverText);

    slice		
        .transition().duration(1000)
        .attrTween("d", function(d) {
            this._current = this._current || d;
            var interpolate = d4.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                return arc(interpolate(t));
            };
        })

    slice.exit()
        .remove();

    /* ------- TEXT LABELS -------*/

    var text = svg.select(".labels").selectAll("text")
        .data(pie(data), key);

    text.enter()
        .append("text")
        .attr("dy", ".35em").attr("fill", "white");


    text.text(function(d) {      //joximir

            let percent = Math.round((d.endAngle - d.startAngle)/(2*Math.PI)*100) + '%';
            return [d.data.label, percent].join(' ');
        });

    function midAngle(d){
        return d.startAngle + (d.endAngle - d.startAngle)/2;
    }

    text.transition().duration(1000)
        .attrTween("transform", function(d) {
            this._current = this._current || d;
            var interpolate = d4.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                var d2 = interpolate(t);
                var pos = outerArc.centroid(d2);
                pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
                return "translate("+ pos +")";
            };
        })
        .styleTween("text-anchor", function(d){
            this._current = this._current || d;
            var interpolate = d4.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                var d2 = interpolate(t);
                return midAngle(d2) < Math.PI ? "start":"end";
            };
        });

    text.exit()
        .remove();

    /* ------- HOVER TEXT LABELS -------*/

    var hoverText = svg.select(".hover-labels").selectAll("text")
        .data(pie(data), key);

    hoverText.enter()
        .append("text")
        .attr('font-size', '1em')
        .style('font-family', 'var(--font-mono)').style('fill','var(--col3)')
        .style('text-anchor', 'middle')
        .attr("dy", "1.35em").attr("fill", "white");

    hoverText.attr("transform", function(d) {
        var pos = outerArc.centroid(d);
        pos[0] = (radius*1.4) * (midAngle(d) < Math.PI ? 1 : -1);
        return "translate("+ pos +")";
    });




    // hoverText.text(function(d) {      //joximir
    //     let blockedData = {};
    //     let allowedData = {};
    //     if(toggle.checked){
    //         blockedData = sessionBlocked;
    //         allowedData = sessionAllowed;
    //     }
    //     else{
    //         blockedData = totalBlocked;
    //         allowedData = totalAllowed;
    //     }

    //     let ret = (d.data.label == 'Allowed') ?
    //     allowedData : blockedData;
    //     return ret;
    //     });


    // hoverText.transition().duration(1000)
    //     .attrTween("transform", function(d) {
    //         this._current = this._current || d;
    //         var interpolate = d4.interpolate(this._current, d);
    //         this._current = interpolate(0);
    //         return function(t) {
    //             var d2 = interpolate(t);
    //             var pos = outerArc.centroid(d2);
    //             pos[0] = (radius*1.2) * (midAngle(d2) < Math.PI ? 1 : -1);
    //             return "translate("+ pos +")";
    //         };
    //     })
    //     .styleTween("text-anchor", function(d){
    //         this._current = this._current || d;
    //         var interpolate = d4.interpolate(this._current, d);
    //         this._current = interpolate(0);
    //         return function(t) {
    //             var d2 = interpolate(t);
    //             return midAngle(d2) < Math.PI ? "start":"end";
    //         };
    //     });

    // hoverText.exit()
    //     .remove();    




    function showHoverText(hovered, indx) {
        let textLabels = hoverText[0];
        textLabels[indx].textContent = hovered.value;
        // console.log(textLabels)
    }
    function hideHoverText(hovered, indx){
        let textLabels = hoverText[0];
        textLabels[indx].textContent = '';   
    }

    /* ------- SLICE TO TEXT POLYLINES -------*/

    var polyline = svg.select(".lines").selectAll("polyline")
        .data(pie(data), key);

    polyline.enter()
        .append("polyline").attr('class', 'polyline');

    polyline.transition().duration(1000)
        .attrTween("points", function(d){
            this._current = this._current || d;
            var interpolate = d4.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                var d2 = interpolate(t);
                var pos = outerArc.centroid(d2);
                pos[0] = radius * 0.9 * (midAngle(d2) < Math.PI ? 1 : -1);
                return [arc.centroid(d2), outerArc.centroid(d2), pos];
            };			
        });

    polyline.exit()
        .remove();
};