
const barChart = {
    target: undefined,      //defined in this.init()
    margin: { top: 30, right: 30, bottom: 10, left: 30 },
    theData: undefined,     //defined in this.drawData()
    toggled: undefined,
    maxNumOfDomains: 25,


// SETUP
setup() {

    this.svg = this.target
        .append("svg")
        .attr("height", "100%").attr("width", "100%");

    this.x = d3.scaleBand().padding(0.3),
    this.y = d3.scaleLinear();

    this.g = this.svg.append("g")
    .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.g.append("g")
        .attr("class", "axis axis--y")
        .attr('transform','translate(-5 0)')
        .append('svg')
        .style('overflow', 'visible')
        .attr('x',0).attr('y','40%')      
        .append("text").attr("class", "axis-y-label")
        .attr("transform", "rotate(-90)")
        .attr("dy", "-1.2em")
        .style("text-anchor", "middle")
        .attr('font-size', "1.3em");

    this.msg = this.svg.append('text').attr('class','chartMsg')
    .attr('x','50%').attr('y','50%')
    .style('text-anchor', 'middle')
    .style('opacity', '0.6')
    .style('font-size','14px')
    .style('font-family', 'var(--font-Nexatext)');
    // .style('font-style', 'italic');


    this.tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return `Blocked <span>${d.count.toLocaleString('en', {useGrouping:true})}</span> requests from </br><span>${d.url}</span>`;
    });
    svg.call(this.tip);
},


// DRAWING
draw() {
    if(barChart.theData == null) return;

    // FILTER EMPTY DATA
    barChart.theData = barChart.theData.filter(el => el.count != 0);
    if(Array.isArray(barChart.theData) && !barChart.theData.length){
        this.msg.text("No data");
        this.g.select('.axis-y-label').text('');
    }
    else {
        this.msg.text('');
        this.g.select('.axis-y-label').text('Number of Requests Blocked');
    }

    var 
    x = this.x,
    y = this.y,
    bounds = this.svg.node().getBoundingClientRect(),
    width = bounds.width - this.margin.left - this.margin.right,
    height = bounds.height - this.margin.top - this.margin.bottom;

    x.rangeRound([0, width]);
    y.rangeRound([height, 0]);

    // DRAW GRID
    this.g.select(".axis--y")
    .call(d3.axisRight(y)
    .tickSize(width + 15)
    .ticks(8, "s"))
    .select(".domain").remove();
    this.g.selectAll(".tick text")
    .attr('x','5').attr('dy','-3')
    .attr('font-size', '12px')
    .attr('text-anchor', 'middle');
    // REPOSITION LABEL
    // this.label.attr('x', width / 2 + this.margin.left);



    var bars = this.g.selectAll(".bar")
    .data(barChart.theData);

    // ENTER
    bars
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function (d) { return x(d.url); })
    .attr("y", function (d) { return y(d.count); })
    .attr("width", x.bandwidth())
    .attr("height", function (d) { return height - y(d.count); })
    .on('mouseover', this.tip.show)
    .on('mouseout', this.tip.hide);

    // UPDATE
    bars.attr("x", function (d) { return x(d.url); })
    .attr("y", function (d) { return y(d.count); })
    .attr("width", x.bandwidth())
    .attr("height", function (d) { return height - y(d.count); });

    // EXIT
    bars.exit()
    .remove();

},


// LOADING DATA THEN DRAWING
drawData(dataArray) {
    var x = this.x,
        y = this.y;
    let tabs = document.getElementsByName('tabs');
    if(tabs[0].checked){
        barChart.theData = dataArray.sort((a, b) => (b.count - a.count));
        let numOfDomains = barChart.theData.findIndex(element => element.count == 0);
        if (numOfDomains > this.maxNumOfDomains || numOfDomains < 0) numOfDomains = this.maxNumOfDomains;
        barChart.theData = barChart.theData.slice(0, numOfDomains);

        x.domain(barChart.theData.map(function (dataArray) { return dataArray.url; }));
        y.domain([0, d3.max(barChart.theData, function (dataArray) { return dataArray.count; })]);

        this.draw();
    }
},

getAndDrawData(){
    chrome.runtime.sendMessage({"what":"get_bar_chart_metrics"},function(response){

        barChart.sessionBlocked = response.sessionDomainsBlockedArray;
        barChart.totalBlocked = response.totalDomainsBlockedArray;

        barChart.drawData(
            barChart.toggled.checked ? 
            barChart.sessionBlocked : barChart.totalBlocked);
    })
},

addListeners() {
    this.toggled.addEventListener('click', function(){
        barChart.drawData(
            barChart.toggled.checked ? 
            barChart.sessionBlocked : barChart.totalBlocked )});

    new ResizeSensor(barChart.target.node(), function(){
        barChart.draw()
    });
},

// START!
init() {
    // gets called in lightbeam.js >> window.onload 
    this.target = d3.select('#chart2');
    this.toggled = document.getElementById('toggle-button');

    this.setup();
    this.getAndDrawData();
    this.addListeners();

    setInterval(function(){
        barChart.getAndDrawData();
    },3000);

}
};