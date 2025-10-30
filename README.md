# Accessible Route Planner

A web application for planning accessible routes for travelers with special needs as well as for travellers with standard mobility. The app helps users find points of interest and plan routes that accommodate mobility requirements and personal preferences.

🌐 **[Try it live on GitHub Pages](https://maxeffectus.github.io/route-planner/)**

## Features

- **Accessibility-Focused Routing**: Plan routes considering wheelchair access, stroller paths, and mobility limitations
- **AI-Powered Recommendations**: Get personalized POI suggestions based on your interests and needs
- **Profile-Based Customization**: Save your mobility type, preferences, and interests for tailored suggestions
- **Route Saving**: Save and manage multiple routes for future reference
- **Multiple Export Formats**: Export routes as GeoJSON or KML for use in other applications
- **Interactive Maps**: Visualize routes and POIs on an interactive map powered by Leaflet
- **Smart POI Filtering**: Filter points of interest by category and accessibility requirements

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm or yarn
- Chrome Canary or Dev v.138+ with enabled [PromptAPI](https://developer.chrome.com/docs/ai/prompt-api) and [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api) features. While Summarizer API is enabled by default, Prompt API is not. To enable Prompt API you can follow [these instructions](https://muthuishere.medium.com/ai-within-your-browser-exploring-google-chromes-new-prompt-api-a5c2c6bd5b4c).

### Installation

```bash
# Clone the repository
git clone https://github.com/maxeffectus/route-planner.git

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built application will be in the `dist` directory.

## Project Structure

```
route_planner/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── models/         # Data models (UserProfile, POI, SavedRoute)
│   ├── pages/          # Page components
│   ├── services/       # API services and business logic
│   ├── utils/          # Utility functions
│   └── static_resources/  # Static assets
├── tests/              # Test suites
├── public/             # Public assets
└── dist/               # Build output
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
```

For more details, see [tests/README.md](tests/README.md)

## Technologies Used

- **React** - UI framework
- **Leaflet & React-Leaflet** - Interactive maps
- **Vite** - Build tool and development server
- **Jest** - Testing framework
- **GraphHopper API** - Route calculation
- **OpenStreetMap API** - POI search and geocoding
- **Chrome Summarizer API** - AI-powered profile summaries
- **Chrome Prompt API** - AI POI recommendations

## Usage scenarios

### First visit

When the user enters the application page, they are prompted by the modal window to type the name of the city where they would like to go. It is not mandatory and the window can be closed. In such case, the user needs to zoom in to their area of interest on the map in order to search for POIs (Points Of Interest), build routes etc.

If the user decides to type the city name, we help them to do so by utilizing Nominatim API (provided by OpenStreetMaps) for city name autocompletion. After the city is selected, the map is zoomed on that city and the app requests the POIs in the visible area via Nominatim API.

The modal window now shows the button "Give me AI highlights". If clicked, we request the highlights for the selected city via Prompt API.

### Interface overview

When the modal window is closed, the user sees the main interface of the app. It is split vertically into 2 parts.

The left part is used to invoke profile-related actions and hosts the accordion with POIs grouped into several categories. When the route is built, the info about this route is also displayed in the left panel.

The right part hosts the interactive map as well as some controls that allow to filter and request the POIs.

### Left panel

#### User profile

For the sake of simplicity, in the current prototype the user profile is stored in the browser's local storage and there's no support for multiple users per browser.

To work with the user profile the user has to click on the button in the top part of the left panel. The button bears the text "Continue Profile Setup (XX% complete)" if the profile is not yet fully set up and "Profile Complete - Edit Profile" otherwise.

Clicking on this button gives the user access to Profile Setup dialog where they can specify their travel preferences and mobility needs and access to the list of the routes that the user saved in their profile.

After completing the profile setup dialog the user can request an optional summary of their profile that is generated by Summarizer API.

#### POI accordion

If some POIs are currently shown on the map, the respective POI tiles appear in different sections of the POI accordion in the left panel.

In this accordion POIs are visually split into the categories that reflect their accessibility for the user (Accessible, Inaccessible, Limited Accessibility, Unknown). For users with standard accessibility all the POIs go to the "Accessible" category and the other categories are not shown.

One more category, "Want to visit", appears in case at least one POI was selected for visiting.

#### Building a route

##### Set start and finish

To build a route the user has to specify the start and finish points of the route and (optionally) some POIs that they want to visit on the way.

Start and finish points can be set via the "Select start/finish point" autocomplete input in the left panel or, alternatively, via right-click on desired positions on the interactive map.

Start and finish points might be the same. E.g., the user might want to come back to the hotel after the walk. The checkbox "Route should start and end at the same place" that allows to do so appears in the left panel as soon as the start point is set.

To build the route, the user needs to click the button "Calculate Route" that becomes available after start and finish points are set.

When performing the API request to Route provider, the transportation mode is chosen based on the preferred transport and mobility data that is stored in the user profile.

After the route is built, it is displayed on the map. General info about the route is shown in the left panel. Currently displayed route can be saved in the user profile.

##### Add POIs to the route

###### Manually adding POIs to the route

To add a POI to the route, the user can select this POI by enabling "Want to visit" checkbox in the POIs tile in the left panel. The POI tile becomes highlighted and is moved to the "Want to visit" section of the POIs accordion. The respective map marker becomes highlighted.

If the user attempts to add a POI that might be inaccessible for them, the corresponding notification is shown.

###### Adding POIs to the route with the help of Prompt API

The user can utilize the capabilities of Prompt API to automatically select several POIs based on their preferences and mobility needs as stored in the User profile.

To do so, the user needs to click the "Pick Points Of Interest with AI" button in the left panel.

Doing so results in prompting the built-in AI to select several most prominent POIs from the list of accessible POIs. The selected POIs are going to be automatically marked as "Want to visit".

##### Saving a route

After the route is built, it can be saved to the user profile by clicking the "Save Route" button that appears in the left panel. The user will be prompted to choose a unique name for the saved route.

All of the saved routes that are currently stored in the user profile are accessible via a dedicated modal window. To open that modal window, the user has to click on the profile button in the very top of the left panel and select the "Saved Routes" option in the "Profile & Routes" popup that appears after.

The modal window with the list of all of the stored routes appears.

##### Loading a route

From the modal window with the saved routes any route can be loaded by clicking the respective button. The loaded route is displayed in the UI and its POIs are also loaded.

##### Exporting a route

Route export is performed from the same modal with the list of all saved routes.

Two export formats are currently supported: 
- GeoJSON
- KML

When exported, the route is saved to a file.

There are many GeoJSON viewers out there.

As for KML, it is natively supported by Google Maps. Such routes can be easily imported to Google Maps via [My Maps](https://www.google.com/maps/d/) and become accessible on any device where the user logs in under their Google account, including smartphones.

That's a critical thing for a traveler.

### Right panel

To open the modal window that was described in the "First visit" paragraph and instantly switch to another city, the user can click the "Select another city" button located in the top part of the panel in the "Interest categories" block.

#### Interest categories

Interest categories and their color coding are shown in the top part of the right panel. Selecting some category results in showing the corresponding POI markers on the map and the related POI tiles in the left panel.

If the user initiates the search for new POIs, only the POIs that correspond to the currently selected interest categories are requested from Nominatim API.

If the user filled their interest categories via the profile setup dialog, the current categories selection can be set in accordance with the profile data. To do so, the user can click the "Set according to my interests" button.

#### POI markers

To decrease the number of API requests to Nominatim API, the POIs are not re-requested when the user moves the map or zooms in or out. To request new POIs the user has to click the button "Find more points of interest in the visible area" that is shown on top of the interactive map.

The markers are clickable. Clicking on the marker zooms the map onto it and shows the respective POI tile in the left panel. General info about the POI is shown in the popup when the corresponding marker is clicked.

Markers have color coding that matches the interest categories colors. Each marker has one or more colors, because some POIs can have more than one interest category.

#### Searching for new POIs

In order not to fetch too many POIs in a single request (Nominatim API might simply refuse to process such request), the minimum zoom level required to request POIs is set to 11. POIs are always requested for the area visible on the map, but they are cached. So, if the user requested some POIs, then moved the map away and afterwards moved the map to the initial position, the POIs are going to be still there.


## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- OpenStreetMap for POI data
- GraphHopper for routing services
- Leaflet for mapping capabilities
