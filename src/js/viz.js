// eslint-disable-next-line no-unused-vars
const viz = {
  scalingFactor: 1.5,
  circleRadius: 5,
  resizeTimer: null,
  minZoom: 0.2,
  maxZoom: 2.5,
  collisionRadius: 5,
  chargeStrength: -120,
  tickCount: 25,
  canvasColor: 'white',
  alphaTargetStart: 0.2,
  alphaTargetStop: 0,
  favIconSize: 20,
  redTriangleToggle: true,

  init(nodes, links) {

    const { width, height } = this.getDimensions();
    const { canvas, context } = this.createCanvas();

    this.canvas = canvas;
    this.context = context;
    this.tooltip = document.getElementById('tooltip');
    this.circleRadius = this.circleRadius * this.scalingFactor;
    this.collisionRadius = this.collisionRadius * this.scalingFactor;
    this.scale = (window.devicePixelRatio || 1) * this.scalingFactor;
    this.transform = d3.zoomIdentity;

    this.updateCanvas(width, height);
    this.draw(nodes, links);
    this.addListeners();
  },

  draw(nodes, links) {
    this.nodes = nodes;
    this.links = links;

    this.simulateForce();
    this.drawOnCanvas();
  },

  simulateForce() {
    if (!this.simulation) {
      this.simulation = d3.forceSimulation(this.nodes);
      this.simulation.on('tick', () => this.drawOnCanvas());
      this.registerSimulationForces();
    } else {
      this.simulation.nodes(this.nodes);
    }
    this.registerLinkForce();
    this.manualTick();
  },

  manualTick() {
    this.simulation.alphaTarget(this.alphaTargetStart);
    for (let i = 0; i < this.tickCount; i++) {
      this.simulation.tick();
    }
    this.stopSimulation();
  },

  restartSimulation() {
    this.simulation.alphaTarget(this.alphaTargetStart);
    this.simulation.restart();
  },

  stopSimulation() {
    this.simulation.alphaTarget(this.alphaTargetStop);
  },

  registerLinkForce() {
    const linkForce = d3.forceLink(this.links);
    linkForce.id((d) => d.hostname);
    this.simulation.force('link', linkForce);
  },

  registerSimulationForces() {
    const centerForce = d3.forceCenter(this.width / 2, this.height / 2);
    this.simulation.force('center', centerForce);

    const forceX = d3.forceX(this.width / 2);
    this.simulation.force('x', forceX);

    const forceY = d3.forceY(this.height / 2);
    this.simulation.force('y', forceY);

    const chargeForce = d3.forceManyBody();
    chargeForce.strength(this.chargeStrength);
    this.simulation.force('charge', chargeForce);

    const collisionForce = d3.forceCollide(this.collisionRadius);
    this.simulation.force('collide', collisionForce);
  },

  createCanvas() {
    const base = document.getElementById('visualization');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    base.appendChild(canvas);

    return {
      canvas,
      context
    };
  },

  updateCanvas(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.setAttribute('width', width * this.scale);
    this.canvas.setAttribute('height', height * this.scale);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.scale(this.scale, this.scale);
  },

  getDimensions() {
    const element = document.getElementById('lightbeam');
    const { width, height } = element.getBoundingClientRect();

    return {
      width,
      height
    };
  },

  drawOnCanvas() {
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
    this.context.translate(this.transform.x, this.transform.y);
    this.context.scale(this.transform.k, this.transform.k);
    this.drawLinks();
    this.drawNodes();
    this.context.restore();
  },

  getRadius(thirdPartyLength) {
    if (thirdPartyLength > 0) {
      if (thirdPartyLength > this.collisionRadius) {
        return this.circleRadius + this.collisionRadius;
      } else {
        return this.circleRadius + thirdPartyLength/2 + 4;
      }
    }
    return this.circleRadius + 4;
  },

drawNodes() {
      for (let node of this.nodes) {
      const x = node.x;
      const y = node.y;
      let radius;

      this.context.beginPath();
      this.context.moveTo(x, y);
      this.context.fillStyle = this.canvasColor;
      if (node.firstParty || node.thirdParties.length > 2) {
        radius = this.getRadius(node.thirdParties.length);
        this.drawFirstParty(x, y, radius);
        this.context.fillStyle = this.canvasColor;
      } 
      else {
        if(node.nFirstPartiesConnectedTo>1 && this.links.some(link => link.target.hostname == node.hostname && link.privacyStatus == true) && this.links.filter(link => link.target.hostname == node.hostname && link.privacyStatus == false).length < 2){
          this.drawThirdPartyShielded(x,y);
        }
        else if(node.privacyStatus == false && node.dangerous && this.redTriangleToggle) {
          this.drawThirdPartyDangerous(x,y);
        }
        else { 
          this.drawThirdParty(x, y); 
        }
      }

      // if (node.shadow) {
      //   this.drawShadow(x, y, radius);
      // }

      //this.context.fillStyle = this.canvasColor;
      this.context.fill();
      this.context.closePath();
      
      if (node.favIconUrl) {
        this.drawFavicon(node);
      }
    }
  },

  getSquare() {
    const side = this.circleRadius * 2;
    const offset = side * 0.5;

    return {
      side,
      offset
    };
  },

  convertURIToImageData1(URI, scaleDownX, scaleDownY, color) {
    var that = this;
    let fillColor = (color === "#414bb2") ? "#414bb2" : "blue";
    return new Promise(function(resolve, reject) {
      if (URI == null) return reject();
      let canvas = document.createElement('canvas'),
          context = canvas.getContext('2d'),
          side = that.getSquare().side;
      let image = new Image();
      image.addEventListener('load', function() {
        canvas.width = scaleDownX * side * that.scale;
        canvas.height = scaleDownY * side * that.scale;
        context.fillStyle = fillColor;
        resolve(image);
      }, true);
      image.src = URI;
    });
},

  async drawFavicon(node) {
      if (!node.image) {
          node.image = await this.convertURIToImageData1(node.favIconUrl, 1, 1);
      }
      this.context.drawImage(node.image, (node.x - this.favIconSize/2), (node.y - this.favIconSize/2), this.favIconSize, this.favIconSize);         
  },

  drawShadow(x, y, radius) {
    const lineWidth = 2,
      shadowBlur = 15,
      shadowRadius = 5;
    this.context.beginPath();
    this.context.lineWidth = lineWidth;
    this.context.shadowColor = this.canvasColor;
    this.context.strokeStyle = 'rgba(0, 0, 0, 1)';
    this.context.shadowBlur = shadowBlur;
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
    this.context.arc(x, y, radius + shadowRadius, 0, 2 * Math.PI);
    this.context.stroke();
    this.context.closePath();
  },


  drawFirstParty(x, y, radius) {
    this.context.arc(x, y,radius*1.2, 0,2 * Math.PI);
  },

  drawThirdPartyShielded(x, y) {
    const deltaY = this.circleRadius / 2;
    const deltaX = deltaY * Math.sqrt(3);

    this.context.lineWidth = 3;
    this.context.setLineDash([0, 0]);
    this.context.strokeStyle = "#2d9bf0";

    this.context.moveTo(x - deltaX, y + deltaY);
    this.context.lineTo(x, y - this.circleRadius);
    this.context.lineTo(x + deltaX, y + deltaY);

    this.context.closePath();
    this.context.stroke();
    this.context.fill();
  },

  drawThirdPartyDangerous(x,y){
    const deltaY = this.circleRadius / 2;
    const deltaX = deltaY * Math.sqrt(3);

    this.context.lineWidth = 3;
    this.context.setLineDash([0, 0]);
    this.context.strokeStyle = "#ff0000";

    this.context.moveTo(x - deltaX, y + deltaY);
    this.context.lineTo(x, y - this.circleRadius);
    this.context.lineTo(x + deltaX, y + deltaY);

    this.context.closePath();
    this.context.stroke();
    this.context.fillStyle = "#c1c1c1";
    this.context.fill();
  },

  drawThirdParty(x,y){
    const deltaY = this.circleRadius*1.2 / 2;
    const deltaX = deltaY * Math.sqrt(3);


    this.context.moveTo(x - deltaX, y + deltaY);
    this.context.lineTo(x, y - this.circleRadius*1.2);
    this.context.lineTo(x + deltaX, y + deltaY);

    this.context.closePath();
    this.context.fill();
  },

  getTooltipPosition(x, y) {
    const tooltipArrowHeight = 20;
    const { right: canvasRight } = this.canvas.getBoundingClientRect();
    const {
      height: tooltipHeight,
      width: tooltipWidth
    } = this.tooltip.getBoundingClientRect();
    const top = y - tooltipHeight - this.circleRadius - tooltipArrowHeight;

    let left;
    if (x + tooltipWidth >= canvasRight) {
      left = x - tooltipWidth;
    } else {
      left = x - (tooltipWidth / 2);
    }

    return {
      left,
      top
    };
  },

  showTooltip(title, x, y) {
    this.tooltip.innerText = title;
    this.tooltip.style.display = 'block';

    const { left, top } = this.getTooltipPosition(x, y);
    this.tooltip.style['left'] = `${left}px`;
    this.tooltip.style['top'] = `${top}px`;
  },

  hideTooltip() {
    this.tooltip.style.display = 'none';
  },

   drawLinks() {
    for (const d of this.links) {
      if (d.privacyStatus == null) {
        //sometimes privacyStatus is undefined, not sure why 
        d.privacyStatus = d.target.privacyStatus && d.source.privacyStatus;
      }
      d.privacyStatus = (d.target.privacyStatus || d.source.privacyStatus)&& d.privacyStatus;
      this.context.beginPath();
      this.context.setLineDash([0, 0]);
      
      const sx = d.source.fx || d.source.x;
      const sy = d.source.fy || d.source.y;
      const tx = d.target.fx || d.target.x;
      const ty = d.target.fy || d.target.y;
      if( d.privacyStatus){
          this.context.strokeStyle = "#2d9bf0"
          this.context.setLineDash([2, 2]);
      }
      else if(d.dangerous && this.redTriangleToggle) {
            this.context.strokeStyle = "#ff0000";
      } 
      else {
        this.context.strokeStyle = '#ffffff';
      }
      this.context.moveTo(sx, sy);
      this.context.lineTo(tx, ty);
      
      this.context.stroke();
      this.context.closePath();
    }
  },


  isPointInsideCircle(x, y, cx, cy) {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    const d = dx * dx + dy * dy;
    const r = this.circleRadius;

    return d <= r * r;
  },

  getNodeAtCoordinates(x, y) {
    for (const node of this.nodes) {
      if (this.isPointInsideCircle(x, y, node.x, node.y)) {
        return node;
      }
    }
    return null;
  },

  getMousePosition(event) {
    const { left, top } = this.canvas.getBoundingClientRect();

    return {
      mouseX: event.clientX - left,
      mouseY: event.clientY - top
    };
  },

  addListeners() {
    this.addMouseMove();
    this.addWindowResize();
    this.addDrag();
    this.addZoom();
  },

  addMouseMove() {
    this.canvas.addEventListener('mousemove', (event) => {
      const { mouseX, mouseY } = this.getMousePosition(event);
      const [ invertX, invertY ] = this.transform.invert([mouseX, mouseY]);
      const node = this.getNodeAtCoordinates(invertX, invertY);
      
      if (node) {
        this.showTooltip(node.hostname, mouseX, mouseY);
      } else {
        this.hideTooltip();
      }
    });
  },

  addWindowResize() {
    var elem = document.getElementById('lightbeam');
    new ResizeSensor(elem, () => {this.resize()} )
  },

  resize() {
    this.canvas.style.width = 0;
    this.canvas.style.height = 0;

    const { width, height } = this.getDimensions();
    this.updateCanvas(width, height);
    this.draw(this.nodes, this.links);
  },

  addDrag() {
    const drag = d3.drag();
    drag.subject(() => this.dragSubject());
    drag.on('start', () => this.dragStart());
    drag.on('drag', () => this.drag());
    drag.on('end', () => this.dragEnd());

    d3.select(this.canvas)
      .call(drag);
  },

  dragSubject() {
    const x = this.transform.invertX(d3.event.x);
    const y = this.transform.invertY(d3.event.y);
    return this.getNodeAtCoordinates(x, y);
  },

  dragStart() {
    if (!d3.event.active) {
      this.restartSimulation();
    }
    d3.event.subject.shadow = true;
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  },

  drag() {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;

    this.hideTooltip();
  },

  dragEnd() {
    if (!d3.event.active) {
      this.stopSimulation();
    }
    d3.event.subject.x = d3.event.subject.fx;
    d3.event.subject.y = d3.event.subject.fy;
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
    d3.event.subject.shadow = false;
  },

  addZoom() {
    const zoom = d3.zoom().scaleExtent([this.minZoom, this.maxZoom]);
    zoom.on('zoom', () => this.zoom());

    d3.select(this.canvas)
      .call(zoom);
  },

  zoom() {
    this.transform = d3.event.transform;
    this.drawOnCanvas();
  }
};
