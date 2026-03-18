# centuries-of-conflict

The files in the [public](/public) directory are deployed to: https://cse442.pages.cs.washington.edu/26wi/fp/centuries-of-conflict

Authors: Shreyan Mitra, Biniyam Gebreyohannes, Kalkidan Maru, and Angelo Villacrez

Generative AI was used for creating the overall webpage design and layout. It was also used for helping to diagnose syntax and formatting issues with the visualization. Commentary and the text component of the visualization were proofreaded by AI.
Dataset extraction and querying was done by Biniyam and Angelo. Visualization design and narrative structure was done by Shreyan and Kalkidan. Everyone contributed to the visualization code.

Data Sources: https://github.com/jrnold/CDB90 (CDB90 dataset) and Wikidata Query Service

Wikidata SPARQL Query can be found at the following file: ``WikidataBattlesQuery.sparql``

Summary of Design Decisions (Contact the authors for more detail):

1. The log scale on Blood Rate, Front Width, and Duration is motivated by the log normal distributions of these values; without log scaling, The Somme at 130% casualty rate, WWI fronts at 200km, and siege durations of several years would squish all other data points into an unreadable mess.
2. Where helpful to the user, zoom and drag functionalities are added to bar charts / maps
3. d3.curveBasis is used to create stream ribbons because it creates maximally smooth organic curves that go through no control points, perfect for the river look, while d3.curveCatmullRom.alpha(0.5) is used when a curve has to go through actual points (centroid trail, trend lines).
4. Stack Layout in Stream Graph: d3.stackOffsetWiggle + d3.stackOrderInsideOut centers the stream on a floating baseline and puts the largest wars in the middle, reducing visual slope and preventing the dominating WWII ribbon from pinning everything to one edge. 10-year bins and only showing the top 20 wars prevents clutter.
5. For the world map, d3.geoNaturalEarth1() was selected for its balanced distortion and oval shape; the country fills are set almost identically to the ocean background, causing the monochrome landmass to recede and the battle dots remain the only readable visual layer.
6. The live zoom scale factor mapk (1 at default, 4 at 4× zoom) is stored at module scope so that renderMap() can access it on every slider tick; dot radii use 2.4 / √(mapK) - a sub-linear calculation that allows dots to expand proportionally with the growing geography without overwhelming densely populated areas; centroid elements use division by mapK directly for pixel accuracy; and scaleExtent sets hard limits on zoom range per chart to prevent disorienting over- and under-zoom.
7. We found no standard color-blind accessible color pallette that contained enough colors for our needs. Therefore, we hardcoded our own color pallette with enough colors based on our personal aesthetic taste. If we had more time to work on this project, we would have given more consideration to doing user studies on our color pallette.
8. Deterministic jitter: Both scatter plots use the stable identifier (battle name or array index) to hash it, ensuring that the offset for each point remains constant, spreading the overlapped 'same location' points in a consistent way rather than randomly repositioning them on redraw.
9. Each battle has a 50 year fade in and fade out period on the world map to allow for easier visualization and prevent battles from appearing for only a split second. d3.interval() advances the map year when the user presses "Play" to provide temporal continuity.
10. Drilldown allows specific battle listings for each war to view the hierarchical nature of the war data. This is presented in a toggle-able sidebar to avoid overwhelming the user with information. The sidebar has a binned bar graph to show the general trends in fighting within a war. This is accomplished using d3.rollup() and d3.bin().
11. Whether in the world map or in the tree map or stream graph, all battles have tooltips (which linger to allow user to interact with them). These tooltips contain important information about casualty and location, along with links to Wikipedia entries where applicable.
12. The domain line is hidden globally (.axis .domain { display: none }) and the tick sizes are kept at 0-3px and angled so that the axes float as orientation guides instead of framing the chart, keeping the data marks as the dominant visual element.
13. Treemap to Stream Graph Animation: The treemap is squarified for consistency and easier visualization. The colors are determined by the index in the _warPalette shared with the stream graph, such that the same war has the same color in both views, which is a prerequisite for the animation feeling consistent. The cells are staggered along the diagonal (x0 + y0 * 0.3) and eased with d3.easeCubicIn on collapse and d3.easeCubicOut on expand, simulating a physical draining effect instead of a simple fade out.
14. For scatter plots, not all points are labeled to prevent clutter and overlap of text labels.

---
The primary thesis of our visualization is that the historical record of human conflicts doesn't necessarily reflect reality but who held the pen. 
While we initially meant to simply provide a visual record of human battles over time, the inherent bias and incompleteness of the data we encountered caused us to modify our research question in this way. 

Nearly half of the data on the Wikidata and CDB90 datasets are from Europe and more than 80% are from within the last 5 centuries, highlighting at least 2 main types of bias - Eurocentrism and recency bias.

