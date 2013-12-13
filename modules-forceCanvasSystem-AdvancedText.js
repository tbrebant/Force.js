/**
 * window.force.modules.forceCanvasSystem.AdvancedText()
 */

/**
 * supported tags: [size={number}][/size]
 *                 [color={any canvas supported color}][/color]
 *                 [font={font family}][/font]
 *                 [br]
 *
 * escape brackets by doubling them: [[this is not a tag]]
 */

/**
 * TODO: implement faster text parser/drawer for more simple cases where we need only line breaks and/or ellipsis
 *       image/icon insertion in the middle of the text
 *       non-breaking spaces
 *       LINK tag!
 */

(function() {

	var INHERIT_FROM = window.force.modules.forceCanvasSystem.Graphical;

	var AdvancedText = function(params) {
		params = init.call(this, params);
		INHERIT_FROM.call(this, params);
		setup.call(this, params);
	};

	window.force.inherit(AdvancedText, INHERIT_FROM);
	
	var or = window.force.modules.helpers.or;
	
	// ------------------------------------------
	// Initialisation
	// ------------------------------------------
	
	function init(params) {
		params = params || {};
		
		params.textBaseline = or(params.textBaseline , 'top');  // supports `top`, `middle` and `bottom`
		params.textAlign    = or(params.textAlign    , 'left'); // supports `left`, `center` and `right` or a number between 0 (left) and 1 (right)
		params.textX        = or(params.textX        , 0);
		params.textY        = or(params.textY        , 0);
		params.anchor       = or(params.anchor       , [0, 0]);
		
		return params;
	}

	function setup(params) {
		this.captionMaxLines           = or(params.captionMaxLines          , null);     // maximum number of line allowed, when reached, text is cut with ellipsis
		this.captionEllipsis           = or(params.captionEllipsis          , '...');    // ellipsis string used
		this.captionLineHeight         = or(params.captionLineHeight        , 1);        // %age (1 based) based on the font size
		this.captionLineBreakingChars  = or(params.captionLineBreakingChars , null);     // characters that seems to be in the middle of words but where line breaks are allowed
		                                                                                 // array of single characters, for example : ['/', '-', '.', '_'] to help with web urls
		                                                                                 // [''] = we can cut at any character
		this.USE_CANVAS_CACHE          = or(params.USE_CANVAS_CACHE         , false);    // instead of drawing every frame with fillText (that can be pretty expensive sometimes
		                                                                                 // (like into CocoonJs) it creates a local canvas and draw only fonts only once into it,
		                                                                                 // and further tumes when a draw is requested, it just paste this canvas into the main one
		this.autoUpdateW               = or(params.autoUpdateW              , false);    // to autoresize the component based on the space used by the text
		this.autoUpdateH               = or(params.autoUpdateH              , false);    //   particularly useful when using canvas caching to avoid the creation of
		                                                                                 //   gigantic unnecessary canvas, or too small onces that may crop the text
		this.autoUpdateMaxW            = or(params.autoUpdateMaxW           , Infinity); // auto-resize max limit
		this.autoUpdateMaxH            = or(params.autoUpdateMaxH           , Infinity); // auto-resize max limit
		
		this.wrappedAreas              = or(params.wrappedAreas             , null);     // array [] of objects like : {
		                                                                                 //   side   : 'left',       // left or right
		                                                                                 //   top    : 20,           // start at
		                                                                                 //   width  : 100           // width
		                                                                                 //   height : 150           // height
		                                                                                 // }
		                                                                                 // used to have the text "wrapping" around this rectangular areas
		
		// internals
		this._cachedCaptionFingerprint = null; // identifier of the current pre-processed cached string (this._cachedCaption)
		this._cachedCaption            = null; // pre-processed cached 'string' (in fact, an array)
		
		this._canvasCache              = null; // canvas object when using USE_CANVAS_CACHE
		this._canvasContext            = null; // context of the previous canvas
		
		this._prevDrawTextAlign        = null; // to store the textAlign value during the previous draw to know if it have to be recalculated
	}

	// retrieve an identifier of the current caption, a fingerprint, to identify if the cached data are still valid or not
	AdvancedText.prototype._getCaptionFingerprint = function () {
		return this.caption + '(' + this.w + ',' + this.h + ',' + this.fontSize + ',' + this.fontFamily + ',' + this.captionMaxLines + ',' + this.textX + ',' + this.textY + ',' + this.textAlign + ')';
	}

	AdvancedText.prototype._getNumericTextAlign = function() {
		var textAlign;
		if (this.textAlign === 'right') {
			return 1;
		} else if (this.textAlign === 'center') {
			return 0.5;
		} else if (this.textAlign === 'left') {
			return 0;
		} else { // assume it's already a number between 0 and 1
			return this.textAlign;
		}
	};

	// main method used to update the content (assigning directly caption is not going to work:
	//   you can still do it but you have to call updateCaption after, without the second parameter
	//   or just a simple updateCaption with the string you want as second parameter
	// this way it's easier to remember that this method is heavy and should not be trigger too often (don't use it to display some text updated every
	// second, this component is not made for this. Technically you can of course, but if you do, check the performances and memory usage..
	AdvancedText.prototype.updateCaption = function(ctx, caption) {
		
		// updating the caption if a new one have been provided or just use the current one
		caption = this.caption = (caption !== undefined && caption !== null) ? caption : ((this.caption !== undefined && this.caption !== null) ? this.caption : '');
		
		if (typeof caption !== 'string' && caption.toString) {
			caption = caption.toString();
		}
		
		// retrieve the fingerprint
		var captionFingerprint = this._getCaptionFingerprint();
		
		if (this._cachedCaptionFingerprint !== captionFingerprint) {
			
			// horizontal text align, number based
			var textAlign = this._getNumericTextAlign();
			
			// retrieve the width and height we have available
			// if the component is in autoresize mode, it's a maximum value, else it's just the current size of the component
			var limitW = this.autoUpdateW ? this.autoUpdateMaxW : this.w;
			var limitH = this.autoUpdateH ? this.autoUpdateMaxH : this.h;

			// replace all double spaces
			while (caption.indexOf('  ') !== -1) {
				caption = caption.replace(/  /g, ' ');
			}
			
			// replace escaped brackets
			caption = caption.replace(/\[\[/g,'&#091;').replace(/\]\]/g,'&#093;');
			
			// explode on tags
			var rawBlocs = caption.split(/(\[.+?\])/g).filter(function(a){ return a !== ''});
			
			// status stacks initialisation
			var fontFamily = [this.fontFamily];
			var fontSize   = [this.fontSize];
			var fontColor  = [this.fontColor];
			
			// jsonisation of the tags based blocs
			var blocs = [];
			var len = rawBlocs.length;
			var currentString = '';
			var type;
			for (var i = 0; i < len; i++) {
				type = 'text';
				
				var content = rawBlocs[i];
				var original = content;
				
				// trim
				content = content.replace(/^\s+/g,'').replace(/\s+$/g,'');
				
				// detect if the current bloc is a text, a tag start or a tag end
				if (content.length > 0 && content.substring(0, 1) === '[') {
					if (content.length > 1 && content.substring(0, 2) === '[/') {
						type = 'tagend';
					} else {
						type = 'tagstart';
					}
				}
				
				// jsonify the current bloc and push it into blocs array if it's a text
				// else if it's a tag, update the status stacks, or push a custom bloc type if needed (like the `br` one)
				if (type === 'text') {
					blocs.push({
						type: 'text',
						fontFamily: fontFamily[fontFamily.length - 1],
						fontSize: Number(fontSize[fontSize.length - 1]),
						fontColor: fontColor[fontColor.length - 1],
						text: content.replace(/&#091;/g, '[').replace(/&#093;/g, ']'),
						spaceBefore: original.substr(0, 1) === ' ' ? true : false,
						spaceAfter: original.substr(-1) === ' ' ? true : false
					});
				} else if (type === 'tagend') {
					content = content.toLowerCase().replace(/ /g, '');
					if (content === '[/color]') {
						fontColor.pop();
					} else if (content === '[/font]') {
						fontFamily.pop();
					} else if (content === '[/size]') {
						fontSize.pop();
					}
				} else if (type === 'tagstart') {
					var cmd = content;
					cmd = cmd.substr(1, cmd.length -2);
					cmd = cmd.split('=');
					// trim
					cmd[0] = cmd[0].toLowerCase().replace(/^\s+/g,'').replace(/\s+$/g,'');
					if(cmd[1]) {
						cmd[1] = cmd[1].replace(/^\s+/g,'').replace(/\s+$/g,'');
					}
					if (cmd[0] === 'color') {
						fontColor.push(cmd[1]);
					} else if (cmd[0] === 'font') {
						fontFamily.push(cmd[1]);
					} else if (cmd[0] === 'size') {
						fontSize.push(cmd[1]);
					} else if (cmd[0] === 'br') {
						blocs.push({
							type: 'br'
						});
					}
				}
			}
			
			// we will assume that when there is a `tag` there is a word separation
			// if we want a behavior where we can change color of letters inside a word without risking line breaks, we should include another
			// bloc of logic here where we explode all words into sub-blocs, and because this logic would be heavy, it should be triggered only
			// by flag activation
			
			// Now we are going to split words into lines: variables preparation first
			var blocsLen = blocs.length;  // caching is good
			var newBlocs = [];            // after line split we will have more blocs than now and with more informations, we will push them into this
			var newBloc = null;           // the single new bloc used in the loop
			var lastFontSize = null;      // current font size, tracked between words
			var lastFontFamily = null;    // current font family, tracked between words
			var spaceSize = null;         // cache for width of current font setup's single space
			var lineHeight = 0;           // height of the current line
			var lineHeights = [];         // list of all line heights
			var lineWidths = [];          // list of all line width
			var ellipsisRequired = false; // will we need ellipsis ? (= text have been cut?)
			
			var currentLineSize = 0;      // current line width
			var currentLine = 0;          // current line number, starting from 0 (line 1 = currentLine 0)
			var wordsOnCurrentLine = 0;   // number of words on the current line
			
			var virtualY = 0;             // track the y position, even if we are not going to store it right now, to identify if there is some margins
			var lineLimitW = limitW;      // each line have a different available width, because margins may be different
			var lineMargins = [];         // list of all lines margins (will contain objects with left and right values)
			
			// if there is wrapped areas (= margins), retrieve the available width for this line (the first one) and push the margin into margins array for further use
			if (this.wrappedAreas) {
				var margin = this._getLineMargins(virtualY);
				lineMargins.push(margin);
				lineLimitW = limitW - margin.marginLeft - margin.marginRight;
			}
			
			// scan of all tag based blocs to create lines
			for (var blocIndex = 0; blocIndex < blocsLen; blocIndex++) {
				// exit the loop if we already reached the maximum number of lines
				if (this.captionMaxLines !== null && currentLine >= this.captionMaxLines) { ellipsisRequired = true; break; }
				
				var bloc = blocs[blocIndex];
				
				if (bloc.type === 'br') {
					
					// new line
					lineHeights[currentLine] = lineHeight;      // save the current line height
					lineWidths[currentLine]  = currentLineSize; // save the current line width
					wordsOnCurrentLine       = 0;               // reset the number of words on the current line
					currentLineSize          = 0                // reset line width / go back to the left
					
					// update dummy y position to be able to locate potential margins
					virtualY += lineHeight * (currentLine > 0 ? this.captionLineHeight : 1);
					
					// if there is wrapped areas (= margins), retrieve the available width for this new line and push the margin into margins array for further use
					if (this.wrappedAreas) {
						var margin = this._getLineMargins(virtualY);
						lineMargins.push(margin);
						lineLimitW = limitW - margin.marginLeft - margin.marginRight;
					} else {
						lineLimitW = limitW;
					}
					
					// increment line
					currentLine++;

					// set a temporary height to this new empty line
					// (if a word is added later, it will be replaced,
					// and if not, the empty line will have the same height as the previous one)
					lineHeight = lastFontSize;
					
				} else if (bloc.type === 'text') {
					
					// explode the current bloc into words
					var words = this.wordsSplit(bloc.text);

					// we are going to push as much words as we can into a new sub bloc
					newBloc = JSON.parse(JSON.stringify(bloc)); // most of the new bloc values are the same as the processed bloc (font, size..)
					newBloc.text = '';                          // but of course not the text
					newBloc.x = currentLineSize;                // x position (calculating as if the text was starting from the left: horizontal alignements will be done later, in another loop)
					newBloc.line = currentLine;                 // blocs need to be aware of their lines
					
					// if the font of this bloc is not the same as the previous used, we update it (to be able to calculate the width of the text)
					if (lastFontSize !== bloc.fontSize || lastFontFamily !== bloc.fontFamily) {
						ctx.font = bloc.fontSize + 'px ' + bloc.fontFamily;
						lastFontSize = bloc.fontSize;
						lastFontFamily = bloc.fontFamily;
						spaceSize = ctx.measureText(' ').width;
					}
					
					// we are going throw all words of this bloc
					var wordsLen = words.length;
					for (var wordIndex = 0; wordIndex < wordsLen; wordIndex++) {
						
						// exit the loop if we already reached the maximum number of lines
						if (this.captionMaxLines !== null && currentLine >= this.captionMaxLines) { ellipsisRequired = true; break; }
						
						// retrieve the current word string
						var word = words[wordIndex].str;
						
						// when we exploded `words`, some may have not be separated by spaces but maybe by special characters like `-` or `/`
						// cf. `this.captionLineBreakingChars` and `this.wordsSplit`
						var wordSpaceBefore = words[wordIndex].spaceBefore;
						
						if (word !== '') {
							var wordSize = ctx.measureText(word).width;
							// if we are on the first word of the bloc, the space have been trimmed, we know if there was a space between
							//   this bloc and the previous one with the help of the flag `spaceBefore` and `spaceAfter` we set previously
							var spaceRequired = wordIndex === 0 ? (newBloc.spaceBefore || (blocIndex > 0 && blocs[blocIndex - 1].spaceAfter)) : wordSpaceBefore;

							if (wordsOnCurrentLine === 0) {
								// we can push the word on the current line, it's the first one of the line

								newBloc.text = word;         // set the text
								wordsOnCurrentLine = 1;      // for the time being there is only one word one this line
								newBloc.x = currentLineSize; // currentLineSize should be everytime 0 at this point
								currentLineSize = wordSize;  // increase the line size position by the word's width
								lineHeight = lastFontSize;   // the height of the line is for the time being the height of the first word
								
							} else if ((currentLineSize + (spaceRequired ? spaceSize : 0) + wordSize) <= lineLimitW) {
								// we can push the word on the current line, there is enough space remaining
								
								newBloc.text += (spaceRequired ? ' ' : '') + word;               // set text
								wordsOnCurrentLine++;                                            // increment the number of words on this line
								currentLineSize += ((spaceRequired ? spaceSize : 0) + wordSize); // increment the line width / position starting from left
								
								// if this word's font is heigher than previous ones on this line we update the current line height
								if (lastFontSize > lineHeight) {
									lineHeight = lastFontSize;
								}
								
							} else {
								// not enough space: we create a new line and push the word into it
								
								// we terminate the previous line by pushing the previous bloc
								if (newBloc.text !== '') {
									newBlocs.push(newBloc);
								}
								
								// store the previous line height and width for future use when centering
								lineHeights[currentLine] = lineHeight;
								lineWidths[currentLine] = currentLineSize;
								
								// update dummy y position to be able to locate potential margins
								virtualY += lineHeight * (currentLine > 0 ? this.captionLineHeight : 1);
								
								// if there is wrapped areas (= margins), retrieve the available width for this new line and push the margin into margins array for further use
								if (this.wrappedAreas) {
									var margin = this._getLineMargins(virtualY);
									lineMargins.push(margin);
									lineLimitW = limitW - margin.marginLeft - margin.marginRight;
								} else {
									lineLimitW = limitW;
								}
								
								// increment current line
								currentLine++;

								// exit the loop if we already reached the maximum number of lines
								if (this.captionMaxLines !== null && currentLine >= this.captionMaxLines) { ellipsisRequired = true; newBloc = null; break; }
								
								// create the new bloc for new line, see previous `newBloc = JSON.parse` for more info
								newBloc = JSON.parse(JSON.stringify(bloc));
								
								// blocs need to be aware of their lines
								newBloc.line = currentLine;

								newBloc.text = word;        // set the text
								wordsOnCurrentLine = 1;     // for the time being there is only one word one this line
								newBloc.x = 0;              // back to the left
								currentLineSize = wordSize; // increase the line size position by the word's width
								lineHeight = lastFontSize;  // the height of the line is for the time being the height of the first word
							}
						}
					}
					// no more words in the currently processed bloc
					if (newBloc && newBloc.text !== '') {
						// if the previous new bloc have not been pushed yet, we do
						newBlocs.push(newBloc);
						// update the line's height and width
						if (!lineHeights[currentLine]) {
							lineHeights[currentLine] = lineHeight;
						}
						lineWidths[currentLine] = currentLineSize;
					}
				}
			}
			// ellipsis insertion needs to know the width available on the last line
			var lastLineLimitW = lineLimitW;


			// ellipsis insertion, if required
			if (ellipsisRequired && this.captionEllipsis) {
				var ellipsisSize = null;
				blocsLen = newBlocs.length;

				var lastBloc = newBlocs[blocsLen - 1];

				var lastLine = lastBloc.line;
				var lastLineWidth = lineWidths[lastLine];
				var ellipsisInserted = false;

				var security = 1000;
				
				// while the latest word still have some characters inside + ellipsis not inserted yet
				while (newBlocs[blocsLen - 1].text.length > 0 && ellipsisInserted === false && security > 0) {
					security--;
					
					// if the font of this bloc is not the same as the previous used, we update it (to be able to calculate the width of the text)
					//   (or if we didn't set the ellipsis size yet (the first time))
					if (lastFontSize !== lastBloc.fontSize || lastFontFamily !== lastBloc.fontFamily || ellipsisSize === null) {
						ctx.font = lastBloc.fontSize + 'px ' + lastBloc.fontFamily;
						lastFontSize = lastBloc.fontSize;
						lastFontFamily = lastBloc.fontFamily;
						ellipsisSize = ctx.measureText(this.captionEllipsis).width;
					}

					if (lastLineWidth + ellipsisSize <= lastLineLimitW) { // have enough space for ellipsis
						lastBloc.text += this.captionEllipsis;
						lastLineWidth += ellipsisSize;
						ellipsisInserted = true;
						break;
					} else { // not enough space
						
						// TODO: implement a parameter allowing to insert ellipsis only between word instead of in their middle
						
						// we try to cut a letter
						if (lastBloc.text.length > 1) { // still have at least 2 characters, we can remove one
							
							var removedLetter = lastBloc.text.slice(-1);
							lastBloc.text = lastBloc.text.slice(0, -1);
							var removedSpace = ctx.measureText(removedLetter).width;
							lastLineWidth = Math.max(0, lastLineWidth - removedSpace);
							
						} else { // only one character was remaining
							
							// let's try to cut this bloc and go up to the previous one
							if (blocsLen > 1 && newBlocs[blocsLen - 2].line === lastLine) { // is the previous block is still on the same (last) line
								
								// we remove the current bloc and jump to the previous one
								var removedSpace = ctx.measureText(lastBloc.text).width;
								lastLineWidth = Math.max(0, lastLineWidth - removedSpace);
								
								newBlocs.pop();
								blocsLen--;
								lastBloc = newBlocs[blocsLen - 1];
								
							} else { // we reached the beginning of the line and still not enough space, it's hopeless: we insert the ellipsis no matter what
								
								// if there is a bloc before, let's use this one's font settings
								if (blocsLen > 1) {
									lastBloc.fontSize = newBlocs[blocsLen - 2].fontSize;
									lastBloc.fontFamily = newBlocs[blocsLen - 2].fontFamily;
									
									ctx.font = lastBloc.fontSize + 'px ' + lastBloc.fontFamily;
									lastFontSize = lastBloc.fontSize;
									lastFontFamily = lastBloc.fontFamily;
									ellipsisSize = ctx.measureText(this.captionEllipsis).width;
								}
								
								lastBloc.text = this.captionEllipsis;
								lastLineWidth = ellipsisSize;
								ellipsisInserted = true;
								break;
							}
						}
					}
				}

				// update the last line height and width
				var newLineHeight = 0;
				for (var i = 0; i < blocsLen; i++) {
					if (newBlocs[blocsLen - 1 - i].line === lastLine) {
						if (newBlocs[blocsLen - 1 - i].fontSize > newLineHeight) {
							newLineHeight = newBlocs[blocsLen - 1 - i].fontSize;
						}
					} else {
						break;
					}
				}
				lineHeights[lastLine] = newLineHeight;
				lineWidths[lastLine] = lastLineWidth;
			}
			
			
			// vertical and horizontal alignements
			// idea/TODO: it's possible to transform vertical and horizontal alignement into number between 0 and 1 instead of predefined top/left/etc..
			
			var verticalDelta = 0; // used only as a delta for text alignement middle and bottom
			
			// default vertical alignement is top: if the current one is bottom or middle we need to calculate the total height of text bloc
			if (this.textBaseline === 'bottom' || this.textBaseline === 'middle') {
				var totalHeight = 0;
				for (var i = 0, lineLen = lineHeights.length; i < lineLen; i++) {
					totalHeight += lineHeights[i] * (i > 0 ? this.captionLineHeight : 1);
				}
				if (this.textBaseline === 'bottom') {
					verticalDelta = -totalHeight;
				} else if (this.textBaseline === 'middle') {
					verticalDelta = -totalHeight / 2;
				}
			}
			
			blocsLen = newBlocs.length;
			var y = verticalDelta; // y is to store the current y position, line by line. it starts by the delta for vertical alignements
			var currentLine = null;
			
			// we are going throw all blocs we created to set the y position, and update the x one for alignements and margins
			for (var blocIndex = 0; blocIndex < blocsLen; blocIndex++) {
				var bloc = newBlocs[blocIndex];
				
				// the current bloc is not on the same line as the previous one (or it's the first iteration of the loop)
				if (currentLine !== bloc.line) {
					
					// if some lines have been skipped (because empty, without any bloc into it)
					if (currentLine !== null && (bloc.line - currentLine) > 1) {
						// we need to update the y position: increase by the height of each skipped line
						for (var i = (currentLine + 1); i < bloc.line; i++) {
							y += lineHeights[i] * (bloc.line > 0 ? this.captionLineHeight : 1);
						}
					}
					
					// regular y increment
					y += bloc.line > 0 ? lineHeights[bloc.line] * this.captionLineHeight : 0;
					
					// update the current line
					currentLine = bloc.line;
				}
				
				// we now know the y position for this bloc
				bloc.y = y;
				
				// let's now manage the horizontal position, furst we need to retrieve the margins if any
				var marginLeft = lineMargins[currentLine] ? lineMargins[currentLine].marginLeft : 0;
				var marginRight = lineMargins[currentLine] ? lineMargins[currentLine].marginRight : 0;
				
				// let's hope limitW is not Infinity... how do you want to "center" or "align to the right" if there is an infinite width?
				// TODO: add an error / warning somewhere before if this case is detected
				var step = ((limitW ? limitW - marginLeft - marginRight : 0) - lineWidths[currentLine]);
				bloc.xLeft  = bloc.x + marginLeft;        // bloc.x + step * 0 + marginLeft
				bloc.xRight = bloc.x + step + marginLeft; // bloc.x + step * 1 + marginLeft
				
				// manage the textX and textY translations
				if (limitW && this.textX) {
					bloc.xLeft  += limitW * this.textX;
					bloc.xRight += limitW * this.textX;
				}
				bloc.x = ((bloc.xRight - bloc.xLeft) * textAlign) + bloc.xLeft;
				
				if (limitH && this.textY) {
					bloc.y += limitH * this.textY;
				}
			}
			
			// estimate the width and height used by the text
			var estimatedWidth = 0, estimatedHeight = 0;
			if (newBlocs[newBlocs.length - 1]) {
				estimatedHeight = newBlocs[newBlocs.length - 1].y + lineHeights[lineHeights.length - 1];
			}
			for (var i = 0, l = lineWidths.length; i < l; i++) {
				// same remark as before about possible limitW equal to Infinity
				var marginLeft = lineMargins[i] ? lineMargins[i].marginLeft : 0;
				var marginRight = lineMargins[i] ? lineMargins[i].marginRight : 0;
				estimatedWidth = Math.max(estimatedWidth, (((limitW ? limitW - marginLeft - marginRight : 0) - lineWidths[i]) * textAlign) + marginLeft + lineWidths[i]);
			}

			// if we need to auto-update the size of the component based on the space used by the text
			if (this.autoUpdateW) {
				this.w = Math.min(this.autoUpdateMaxW, estimatedWidth + 1); // +1 to be safe with anti-aliasings
			}
			if (this.autoUpdateH) {
				// + 0.x * height of last line to be safe with characters going under the line like g, y and other j
				this.h = Math.min(this.autoUpdateMaxH, estimatedHeight + lineHeights[lineHeights.length - 1] * 0.3); // TODO: should parameterize this 0.x
			}
			
			// to group the blocs sharing the same properties (color/font size..) to avoid as much as possible context changes
			this.optimizeDrawOrder(newBlocs);
			
			// update the cache and the cache fingerprint
			this._cachedCaption = newBlocs;
			this._cachedCaptionFingerprint = captionFingerprint;

			// canvas cache mode: update the cache
			if (this.USE_CANVAS_CACHE) {
				// on CocoonJs it's better to delete and recreate a new canvas than trying to resize an existing one (glitches and bugs)
				// TODO: if it's not CocoonJs should just resize and clear the existing one
				if (!this._canvasCache || this._canvasCache.width !== this.w || this._canvasCache.height !== this.h) {
					if (this._canvasCache) {
						this._canvasCache = null; // TODO: add CocoonJs faster method to free memory?
					}
					this._canvasCache = document.createElement('canvas');
					this._canvasCache.width = this.w;
					this._canvasCache.height = this.h;
					this._canvasContext = this._canvasCache.getContext('2d');
				}
				this._canvasContext.clearRect(0, 0, this.w, this.h);
				this.drawText(this._canvasContext);
			}

			return {
				linesUsed: lineHeights.length,
				ellipsisUsed: ellipsisRequired,
				estimatedWidth: estimatedWidth,
				estimatedHeight: estimatedHeight
			};
		}
		return null;
	};

	AdvancedText.prototype._getLineMargins = function(virtualY) {
		var marginLeft = 0;
		var marginRight = 0;
		for (var i = 0, l = this.wrappedAreas.length; i < l; i++) {
			var bloc = this.wrappedAreas[i];
			if (virtualY >= bloc.top && virtualY <= bloc.top + bloc.height) {
				// we are vertically in a bloc
				if (bloc.side === 'left') {
					marginLeft = Math.max(marginLeft, bloc.width);
				} else if (bloc.side === 'right') {
					marginRight = Math.max(marginRight, bloc.width);
				}
			}
		}
		
		return {
			marginLeft: marginLeft,
			marginRight: marginRight
		}
	};

	AdvancedText.prototype._groupBlocsByColor = function(bloc1, bloc2) {
		if (bloc1.fontColor === bloc2.fontColor) {
			return 0;
		}
		return bloc1.fontColor < bloc2.fontColor ? -1 : 1;
	};

	AdvancedText.prototype._groupBlocsBySizeAndFamily = function(bloc1, bloc2) {
		var a = bloc1.fontSize + '|' + bloc1.fontFamily;
		var b = bloc2.fontSize + '|' + bloc2.fontFamily;
		if (a === b) {
			return 0;
		}
		return a < b ? -1 : 1;
	};

	AdvancedText.prototype.optimizeDrawOrder = function(blocs) {
		var fontSizeAndFamilyChanges = 0;
		var fontColorChanges = 0;
		var currentSizeFamily = null;
		var currentColor = null;
		var now;
		for (var i = 0; i < blocs.length; i++) {
			now = blocs[i].fontSize + '|' + blocs[i].fontFamily;
			if (!currentSizeFamily || currentSizeFamily !== now) {
				currentSizeFamily = now;
				fontSizeAndFamilyChanges++;
			}
			if (!currentColor || currentColor !== blocs[i].fontColor) {
				currentColor = blocs[i].fontColor;
				fontColorChanges++;
			}
		}
		if (fontSizeAndFamilyChanges > fontColorChanges) {
			blocs = blocs.sort(this._groupBlocsBySizeAndFamily);
		} else {
			blocs = blocs.sort(this._groupBlocsByColor);
		}
	};

	AdvancedText.prototype.wordsSplit = function(str) {
		var separators = this.captionLineBreakingChars;
		var str = str.split(' ');
		
		for (var i = 0; i < str.length; i++) {
			str[i] = {
				str: str[i],
				spaceBefore: i === 0 ? false : true
			}
		}
		
		if (!separators || separators.length === 0) {
			return str;
		}
		
		for (var currentSeparator = 0; currentSeparator < separators.length; currentSeparator++) {
			var newStr = [];
			for (var i = 0; i < str.length; i++) {
				var word = str[i].str;
				var sub = word.split(separators[currentSeparator]);

				for (var f = 0; f < sub.length; f++) {
					if (f > 0) {
						newStr.push({
							str: separators[currentSeparator] + sub[f],
							spaceBefore: false
						});
					} else {
						newStr.push({
							str: sub[f],
							spaceBefore: str[i].spaceBefore
						});
					}
				}
			}
			str = newStr;
		}

		// cleanup and pull up separators to the end of previous word
		for (var i = 0; i < (str.length - 1); i++) {
			if (str[i + 1].str.length > 0) {
				var c = str[i + 1].str.substr(0, 1);
				if (separators.indexOf(c) !== -1 && str[i].str !== c) {
					str[i].str += c;
					str[i + 1].str = str[i + 1].str.substring(1);
					
					if (str[i + 1].str === '') {
						str.splice(i + 1, 1);
					}
				}
			}
		}

		return str;
	};

	AdvancedText.prototype.drawCaption = function(ctx) {
		if (this.USE_CANVAS_CACHE && this._canvasCache) {
			ctx.drawImage(this._canvasCache, 0, 0);
		} else {
			this.drawText(ctx);
		}
	}

	AdvancedText.prototype.drawText = function(ctx) {
		if (this._cachedCaption) {
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';

			// determine if we have to recalculate the text align
			var refreshTextAlign = false;
			var textAlign;
			if (this.textAlign !== this._prevDrawTextAlign) {
				textAlign = this._getNumericTextAlign();
				this._prevDrawTextAlign = this.textAlign;
				refreshTextAlign = true;
			}
			
			// retrieve current context fill style
			var currentColor; // CocoonJs bug, should be: var currentColor = ctx.fillStyle;
			                  // even if the current context filStyle is the right one, in cocoonJs
			                  // it looks like we need to re-set it at least the first time in this scope... mmm...
			
			// retrieve current context font size and family if any
			var currentSize = null;
			var currentFamily = null;
			if (ctx.font && ctx.font.indexOf('px ') !== -1) {
				var exploded = ctx.font.split('px ');
				if (exploded[0] && exploded[1]) {
					currentSize = Number(exploded[0]);
					currentFamily = exploded[1];
				}
			}
			
			for (var i = 0, len = this._cachedCaption.length; i < len; i++) {
				var bloc = this._cachedCaption[i];
				if (bloc.fontColor !== currentColor) {
					currentColor = bloc.fontColor;
					ctx.fillStyle = currentColor;
				}
				if (bloc.fontSize !== currentSize || bloc.fontFamily !== currentFamily) {
					currentSize = bloc.fontSize;
					currentFamily = bloc.fontFamily;
					ctx.font = currentSize + 'px ' + currentFamily;
				}
				
				// recalculate bloc's text align if required
				if (refreshTextAlign) {
					bloc.x = ((bloc.xRight - bloc.xLeft) * textAlign) + bloc.xLeft;
				}

				ctx.fillText(bloc.text, Math.round(bloc.x), Math.round(bloc.y));
			}
		}
	}

	// extend prepareDestroy
	AdvancedText.prototype.prepareDestroy = function() {
		INHERIT_FROM.prototype.prepareDestroy.call(this);
		if (this._canvasCache) {
			this._canvasCache = null;
		}
	};

	// expose module
	window.force.expose('window.force.modules.forceCanvasSystem.AdvancedText', AdvancedText);
})();
