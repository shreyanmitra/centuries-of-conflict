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

---
The primary thesis of our visualization is that the historical record of human conflicts doesn't necessarily reflect reality but who held the pen. 
While we initially meant to simply provide a visual record of human battles over time, the inherent bias and incompleteness of the data we encountered caused us to modify our research question in this way. 

Nearly half of the data on the Wikidata and CDB90 datasets are from Europe and more than 80% are from within the last 5 centuries, highlighting at least 2 main types of bias - Eurocentrism and recency bias.

