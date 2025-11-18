# Histomap

Histomap is a simple web app that lets people create visualizations of history. It can also export those visualizations as PDFs that you can take to a printer to print out.

The system consists of the following parts:
* **Event Sets** - Multiple JSON-formatted datasets containing sets of events that a user can choose to visualize. Each ovent has a start time, and optional end time, a name, and a priority (expressing how important it is). These files are static - produced either by AI or manual editing by a human. The names should be short, so they don't take up too much visualization space.
* **Web Interface** - This allows visualizating the data


The Web interface consits of the following parts:
* **Controls** - Various controls a user can use to determine how they want the visualization to look
* **Visulization** - Visualizes history, as requested by the controls

The controls consist of the following:
* **Event set selector** - Allows the user to choose which of the event sets they want to visualize. They can choose to visualize multiple sets together.
* **Event set height selector** - Allow the user to choose how high a particular event set is visualised relative to the other bands. Default is 'normal' but you can also choose 'half', or 'double' to make a data set take up more or less space.
* **Time range controls** - Allow the user to select what period of time they want to visualizet
* **Height and width selection** - Allow the user to choose how high and widge they want the visualization to be (particularly important for printing).
* **Various other visual style controls** 

The visualization takes the following structure:
* **Multiple horizonal bands** - one for each of the event sets that have been turned on. The relative height of each .
* **Time goes horizontally** - Each x position corresponds to a particular data. All event bands are on the same timelne.
* **Dot and line for each event** - Each event has a small circle at it's start time. If it has an end time then it has a horizontal line going from it's start time to it's end time (but no end dot).
* **Name for each event next to the dot** - Letting the user know what the event is.
* **Important and minor events** - Each bar has up to two rows for the most important events, and then a larger number of minor events are shown with smaller text, smaller dots, thinner lines, and fainter colors. The minor events are below the major ones.
* **Different color for each band** - Each band has a different color, using tasteful color gradients.

Ability to export as PDF for printing:
* **There is a button on the page to export as PDF**. This exports the same content that was rendered on the screen, with the same dimensions, but in a resolution-indpendent PDF (not rendered via canvas but likely by SVG).

Implementation:
* **Likely rendered with SVG** - To allow effective PDF export.
* **Data sets stored as static files** - We create them offline, serve them as JSON, and on-page javascript does the work.
* **Single page javascript app** - Not using React etc since we are working in SVG. Maybe there is a UI library we can build on, but I'm guessing we probably roll this from scratch.


Initial data sets are focussed on the history of the united states, from 1775 to today.
Data sets are:
* **Wars**: E.g. the civil war, WW1/2, Vietnam war, 1812 war, Spanish-american war.
* **Other major historical events**: Eg. the great deperession, the trail of tears, the lousiana purchase, the industrial revolution.
* **Lifetimes of notable historical people**:  Both American and non-american - focussing on people well known today. Start and end are their birth and death dates.
* **Media**: Creation dates of notable movies, books, songs etc. Particularly ones that are still very popular today and may be older than people realize. E.g. Back to the Future, Terminator, Star Wars.





