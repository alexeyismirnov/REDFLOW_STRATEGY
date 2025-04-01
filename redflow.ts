// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © CryptoMF

//@version=4
strategy("MF_REDFLOW_STRATEGY", overlay=true, currency="USD", default_qty_type=strategy.percent_of_equity,  pyramiding=10, initial_capital=500, default_qty_value=100,commission_type=strategy.commission.percent,commission_value=0.075)

// ----------------- Global Variables ---------------- //

var position = 0
var float price = na
var float flipprice = na
var bool buySignal = na
var bool sellSignal = na
var bool flipSignal = na
var bool tpSignal = na
var bool closeSignal = na
var int tptime = 0

closeSignal := na

// ------------------- Supertrend -------------------- //

//stsrc = input(type=input.string, title="Source", defval="Close", options=["Close", "EMA"])
stlen = input(type=input.integer, defval=7, title="ATR Length")
stmult = input(type=input.float, defval=7, title="Multiplier")
stsmooth = input(type=input.integer, defval=5, title="Smoothing")

stsrcdata = timeframe.period == "240" ?  close : na
//stsrcdata = stsrc == "Close" ? close : ema(close, 21)
//up = hl2 - (stmult * atr(stlen))
//up1 = nz(up[1], up)
//up := stsrcdata[1] > up1 ? max(up, up1) : up
//dn = hl2 + (stmult * atr(stlen))
//dn1 = nz(dn[1], dn)
//dn := stsrcdata[1] < dn1 ? min(dn, dn1) : dn
//stdir = 1
//stdir := nz(stdir[1], stdir)
//stdir := stdir == -1 and stsrcdata > dn1 ? 1 : stdir == 1 and stsrcdata < up1 ? -1 : stdir
//sttrend = stdir == 1 ? up : stdir == -1 ? dn : na

[sttrend, stdir] = supertrend(stmult, stlen)

if timeframe.period != "240"
    sttrend := na
    stdir := 0

dir = stdir == stdir[1] ? (stdir == 1 ? "up" : "down") : ""
col = barssince(dir == "") > stsmooth ? (dir == "up" ? color.red : dir == "down" ? color.green : color.new(color.black, 100)) : color.new(color.black, 100)

// --------------- Entry Protection Supertrend --------------- //

useep = input(false, "Enable Entry Protection", type=input.bool)
//epstmult = stmult / 2
epstmult = input(type=input.float, defval=3, title="Protection Multiplier")
[epsttrend, epstdir] = supertrend(epstmult, stlen)
epcol = barssince(dir == "") > stsmooth ? (dir == "up" ? color.red : dir == "down" ? color.green : color.new(color.black, 100)) : color.new(color.black, 100)

var float eplevel = na
var bool epinvalid = false
var bool sttakeover = false
var bool epshow = false

epinvalid := (position == 1 and sttrend > flipprice) or (position == -1 and sttrend < flipprice) ? true : false
sttakeover := (position == 1 and sttrend > eplevel) or (position == -1 and sttrend < eplevel) ? true : false
epsttrendsmooth = sma(epsttrend,stsmooth)
eplevel := useep and (not epinvalid and not sttakeover) ? epsttrendsmooth : na


// --------- Take Profit and Reload Settings --------- //


tppct = input(false, "Take Profit at % Intervals", type=input.bool)
tprsx = input(true, "Take Profit on RSX Divergence", type=input.bool)
tpgap = input(10.0, title="Take Profits Must be at Least (%) Apart", type=input.float, step=0.1)
tpmax = input(10, title="Maximum Take Profits Before Close", type=input.float, step=1, minval=0, maxval=10)
tpamt = input(30, title="Take Profit % Size", type=input.integer)
rlrsx = input(true, "Reload on RSX Divergence (Requires Take Profit)", type=input.bool)
rlsfp = input(true, "Reload on Supertrend SFP (Requires Take Profit)", type=input.bool)


// ---------------------- RSX ------------------------ //


//usersx = input(true, "Use RSX Divergence (TP and Reload)", type=input.bool)
rsxsrc = input(hlc3, title="RSX Source", type=input.source)
rsxlen = input(14, title="RSX Length", type=input.integer)
rsxlkb = input(20, title="Pivot Lookback", type=input.integer)
rsxob = input(75, title="Overbought Level", type=input.integer)
rsxos = input(25, title="Oversold Level", type=input.integer)
rsxignpct = input(6, title="Ignore Divergence within % of Entry Price")


f8 = 100 * rsxsrc
f10 = nz(f8[1])
v8 = f8 - f10

f18 = 3 / (rsxlen + 2)
f20 = 1 - f18

f28 = 0.0
f28 := f20 * nz(f28[1]) + f18 * v8

f30 = 0.0
f30 := f18 * f28 + f20 * nz(f30[1])
vC = f28 * 1.5 - f30 * 0.5

f38 = 0.0
f38 := f20 * nz(f38[1]) + f18 * vC

f40 = 0.0
f40 := f18 * f38 + f20 * nz(f40[1])
v10 = f38 * 1.5 - f40 * 0.5

f48 = 0.0
f48 := f20 * nz(f48[1]) + f18 * v10

f50 = 0.0
f50 := f18 * f48 + f20 * nz(f50[1])
v14 = f48 * 1.5 - f50 * 0.5

f58 = 0.0
f58 := f20 * nz(f58[1]) + f18 * abs(v8)

f60 = 0.0
f60 := f18 * f58 + f20 * nz(f60[1])
v18 = f58 * 1.5 - f60 * 0.5

f68 = 0.0
f68 := f20 * nz(f68[1]) + f18 * v18

f70 = 0.0
f70 := f18 * f68 + f20 * nz(f70[1])
v1C = f68 * 1.5 - f70 * 0.5

f78 = 0.0
f78 := f20 * nz(f78[1]) + f18 * v1C

f80 = 0.0
f80 := f18 * f78 + f20 * nz(f80[1])
v20 = f78 * 1.5 - f80 * 0.5

f88_ = 0.0
f90_ = 0.0

f88 = 0.0
f90_ := nz(f90_[1]) == 0 ? 1 : 
   nz(f88[1]) <= nz(f90_[1]) ? nz(f88[1]) + 1 : nz(f90_[1]) + 1
f88 := nz(f90_[1]) == 0 and rsxlen - 1 >= 5 ? rsxlen - 1 : 5

f0 = f88 >= f90_ and f8 != f10 ? 1 : 0
f90 = f88 == f90_ and f0 == 0 ? 0 : f90_

v4_ = f88 < f90 and v20 > 0 ? (v14 / v20 + 1) * 50 : 50
rsx = v4_ > 100 ? 100 : v4_ < 0 ? 0 : v4_

transparent = color.new(color.white, 100)

//piv = input(false, "Hide pivots?")
hb = abs(highestbars(rsx, rsxlkb))  // Finds bar with highest value in last X bars
lb = abs(lowestbars(rsx, rsxlkb))   // Finds bar with lowest value in last X bars
max = float(na)
max_rsi = float(na)
min = float(na)
min_rsi = float(na)
pivoth = bool(na)
pivotl = bool(na)
divbear = bool(na)
divbull = bool(na)

// If bar with lowest / highest is current bar, use it's value
max := hb == 0 ? close : na(max[1]) ? close : max[1]
max_rsi := hb == 0 ? rsx : na(max_rsi[1]) ? rsx : max_rsi[1]
min := lb == 0 ? close : na(min[1]) ? close : min[1]
min_rsi := lb == 0 ? rsx : na(min_rsi[1]) ? rsx : min_rsi[1]

// Compare high of current bar being examined with previous bar's high
// If curr bar high is higher than the max bar high in the lookback window range
if close > max  // we have a new high
    max := close  // change variable "max" to use current bar's high value
    max
if rsx > max_rsi  // we have a new high
    max_rsi := rsx  // change variable "max_rsi" to use current bar's RSI value
    max_rsi
if close < min  // we have a new low
    min := close  // change variable "min" to use current bar's low value
    min
if rsx < min_rsi  // we have a new low
    min_rsi := rsx  // change variable "min_rsi" to use current bar's RSI value
    min_rsi

// Finds pivot point with at least 2 right candles with lower value
pivoth := max_rsi == max_rsi[2] and max_rsi[2] != max_rsi[3] ? true : na
pivotl := min_rsi == min_rsi[2] and min_rsi[2] != min_rsi[3] ? true : na

// Ignore Div?
rsxign = abs(100 - (close / price) * 100) < rsxignpct

// Detects divergences between price and indicator with 1 candle delay so it filters out repeating divergences
if max[1] > max[2] and rsx[1] < max_rsi and rsx <= rsx[1] and rsx > rsxob and not rsxign 
 and not (max[2] > max[3] and rsx[2] < max_rsi[1] and rsx[1] <= rsx[2]) 
 and not (max[3] > max[4] and rsx[3] < max_rsi[2] and rsx[2] <= rsx[3]) 
 and not (max[4] > max[5] and rsx[4] < max_rsi[3] and rsx[3] <= rsx[4]) 
    divbear := true
    divbear
if min[1] < min[2] and rsx[1] > min_rsi and rsx >= rsx[1] and rsx < rsxos and not rsxign 
 and not (min[2] < min[3] and rsx[2] > min_rsi[1] and rsx[1] >= rsx[2]) 
 and not (min[3] < min[4] and rsx[3] > min_rsi[2] and rsx[2] >= rsx[3]) 
 and not (min[4] < min[5] and rsx[4] > min_rsi[3] and rsx[3] >= rsx[4]) 
    divbull := true
    divbull
    

// -------------- Backtest Window --------------------- //

usewindow = input(true, "Use Specific Backtest Window", type=input.bool)
start = input(defval = timestamp("1 Jan 2019 00:00 +0000"), title = "Backtest Start", type = input.time)
finish = input(defval = timestamp("31 Dec 9999 23:59 +0000"), title = "Backtest Finish", type = input.time)
window()  => usewindow and time >= start and time <= finish ? true : false


// -------------- Strategy Logic --------------------- //

usefrosty = input(true, "Use Frostybot Alert Triggers", type=input.bool)
frostyType = input("JS", "Frostybot Type", options=["JS", "PHP"])
frostyStub = input("ftx", "Account Stub", type=input.string)
frostySize = input(1, "Position Size", type=input.integer)
frostySizeType = input("x", "Size Type", options=["$", "x", "%"])


var float tpprice = na
var float prevtpprice = na
var tpnum = 0

stSfpLong = timeframe.period == "240" and (rlsfp and open > sttrend and low < sttrend and close >= sttrend) and not (rlsfp and open[1] > sttrend and low[1] < sttrend and close[1] >= sttrend)
stSfpShort = timeframe.period == "240" and (rlsfp and open < sttrend and high > sttrend and close <= sttrend) and not (rlsfp and open[1] < sttrend and high[1] > sttrend and close[1] <= sttrend)

buySignal   := timeframe.period == "240" and (crossover(stsrcdata[1], sttrend) or (position == 0 and dir == "down" and crossover(stsrcdata[1], eplevel))) or (position == 0 and stSfpLong) and window()
sellSignal  := timeframe.period == "240" and (crossunder(stsrcdata[1], sttrend) or (position == 0 and dir == "up" and crossunder(stsrcdata[1], eplevel))) or (position == 0 and stSfpShort) and window()
flipSignal  := timeframe.period == "240" and (crossover(stsrcdata[1], sttrend) or crossunder(stsrcdata[1], sttrend)) and window()
closeSignal := timeframe.period == "240" and (position == 1 and crossunder(stsrcdata[1], eplevel) and eplevel < flipprice and tpnum == 0) or (position == -1 and crossover(stsrcdata[1], eplevel) and eplevel > flipprice and tpnum == 0) ? true : false

if (buySignal and not flipSignal and close < flipprice)
    flipprice := close

if (sellSignal and not flipSignal and close > flipprice)
    flipprice := close
    
rlLongSignal = timeframe.period == "240" and ((rlrsx and divbull) or stSfpLong) and ((position==1 and tpnum > 0) or (position == 0 and dir == "down"))
rlShortSignal = timeframe.period == "240" and ((rlrsx and divbear) or stSfpShort) and ((position==-1 and tpnum > 0) or (position == 0 and dir == "up"))

position := strategy.position_size > 0 ? 1 : strategy.position_size < 0 ? -1 : 0

if (rlLongSignal or rlShortSignal)
    tpnum := 0
    prevtpprice := close
    closeSignal := na
    epinvalid := false

tpDistance = 100 - ((close / prevtpprice) * 100)
tpLongSignal = ((tprsx and divbull[2]) or tppct) and (position==-1 and tpDistance > tpgap)
tpShortSignal = ((tprsx and divbear[2]) or tppct) and (position==1 and tpDistance < 0 - tpgap)
tpSignal := (tpLongSignal or tpShortSignal) and (not buySignal or sellSignal) ? true : false

if (tpSignal)
    tpnum := tpnum + 1
    tpprice := close
    prevtpprice := close

if (tpnum > tpmax)
    closeSignal := true
    
if (buySignal or sellSignal)
    tpnum := 0
    prevtpprice := close
    closeSignal := na
    epinvalid := false

if (flipSignal)
    flipprice := close

position := (buySignal or rlLongSignal ? 1 : (sellSignal or rlShortSignal ? -1 : position))
price := (buySignal and position == 1) or (sellSignal and position==-1) or (rlLongSignal or rlShortSignal) ? close : price
priceDiff = close - price
pctDiff = position == -1 ? 0 - floor(((priceDiff / price) * 100)) : (position == 1 ? floor((priceDiff / price) * 100) : floor(((priceDiff / price) * 100)))

if (closeSignal)
    tpnum := 0
    closeSignal := true
    tpLongSignal := false
    tpShortSignal := false
    tpSignal := false
    position := 0

cmdPrefix = frostyType == "PHP" ? "" : "trade:"

longCommand = usefrosty ? cmdPrefix+frostyStub+":long size="+tostring(frostySize)+(frostySizeType == "$" ? "" : frostySizeType)+" symbol="+syminfo.ticker+" comment=Long": "Long"
shortCommand = usefrosty ? cmdPrefix+frostyStub+":short size="+tostring(frostySize)+(frostySizeType == "$" ? "" : frostySizeType)+" symbol="+syminfo.ticker+" comment=Short" : "Short"
rlLongCommand = usefrosty ? cmdPrefix+frostyStub+":long size="+tostring(frostySize)+(frostySizeType == "$" ? "" : frostySizeType)+" symbol="+syminfo.ticker+" comment=Reload" : "Reload"
rlShortCommand = usefrosty ? cmdPrefix+frostyStub+":short size="+tostring(frostySize)+(frostySizeType == "$" ? "" : frostySizeType)+" symbol="+syminfo.ticker+" comment=Reload" : "Reload"
tpCommand = usefrosty ? cmdPrefix+frostyStub+":close size="+tostring(tpamt)+"% symbol="+syminfo.ticker+" comment=TP" : "TP"
closeCommand = usefrosty ? cmdPrefix+frostyStub+":close symbol="+syminfo.ticker+" comment=Close" : "Close"


tpComment = "TP ("+tostring(pctDiff)+"%)"
closeComment = "Close ("+tostring(pctDiff)+"%)"

strategy.entry("Long", strategy.long, when = buySignal and window(), comment = "Long", alert_message = longCommand)
strategy.entry("Short", strategy.short, when = sellSignal and window(), comment = "Short", alert_message = shortCommand)
strategy.entry("Long", strategy.long, when = rlLongSignal and window(), comment = "Reload", alert_message = rlLongCommand)
strategy.entry("Short", strategy.short, when = rlShortSignal and window(), comment = "Reload", alert_message = rlShortCommand)
strategy.exit("TP1", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 1 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP2", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 2 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP3", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 3 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP4", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 4 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP5", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 5 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP6", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 6 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP7", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 7 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP8", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 8 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP9", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 9 and window(), comment = tpComment, alert_message = tpCommand)
strategy.exit("TP10", from_entry="", limit=tpprice, qty_percent=tpamt, when=tpSignal and tpnum == 10 and window(), comment = tpComment, alert_message = tpCommand)
strategy.close("Long", qty_percent=100, when=closeSignal and window(), comment = closeComment, alert_message = closeCommand)
strategy.close("Short", qty_percent=100, when=closeSignal and window(), comment = closeComment, alert_message = closeCommand)

tpSignal := false


// ------------- Labels and Plots -------------------- //

plot(sma(sttrend, stsmooth), color=col, linewidth=2, title="Supertrend")

epplot = (position == 1 and close > eplevel and eplevel > sttrend and eplevel < flipprice) or (position == -1 and close < eplevel and eplevel < sttrend and eplevel > flipprice) ? eplevel : na
plot(epplot, color=epcol, linewidth=1, title="Entry Protection", style=plot.style_circles)

flipplot = (dir == "up" and flipprice < sttrend ? flipprice : (dir == "down" and flipprice > sttrend ? flipprice : na)) 
flipplotcol = (position == 1 ? color.green : (position == -1 ? color.red : color.new(color.black, 100)))
plot(flipplot, title="Entry Price", color=flipplotcol, style=plot.style_circles, linewidth=1)

useLabels = input(false, "Show Labels", type=input.bool)
plotshape(useLabels and buySignal, text='Buy', style=shape.labelup, location=location.belowbar, color=color.green, textcolor=color.white, offset=0, title="Buy Signal", transp=0)
plotshape(useLabels and sellSignal, text='Sell', style=shape.labeldown, location=location.abovebar, color=color.red, textcolor=color.white, offset=0, title="Sell Signal", transp=0)
plotshape(useLabels and rlLongSignal ? low  : na, text='Reload', style=shape.labelup, location=location.absolute, color=color.green, textcolor=color.white, offset=0, title="Reload Long", transp=0)
plotshape(useLabels and rlShortSignal ? high : na, text='Reload', style=shape.labeldown, location=location.absolute, color=color.red, textcolor=color.white, offset=0, title="Reload Short", transp=0)
plotshape(useLabels and tpLongSignal ? low  : na, text='TP', style=shape.labelup, location=location.absolute, color=color.fuchsia, textcolor=color.white, offset=0, title="Take Profit (Div, Long)", transp=0)
plotshape(useLabels and tpShortSignal ? high : na, text='TP', style=shape.labeldown, location=location.absolute, color=color.fuchsia, textcolor=color.white, offset=0, title="Take Profit (Div, Short)", transp=0)
plotshape(useLabels and closeSignal ? high : na, text='Close', style=shape.labeldown, location=location.absolute, color=color.blue, textcolor=color.white, offset=0, title="Close Signal", transp=0)

plotshape(stSfpLong, style=shape.triangleup, location=location.belowbar, color=color.green, offset=0, title="SFP Long", transp=0)
plotshape(stSfpShort, style=shape.triangledown, location=location.abovebar, color=color.red, offset=0, title="SFP Short", transp=0)

