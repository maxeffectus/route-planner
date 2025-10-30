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

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- OpenStreetMap for POI data
- GraphHopper for routing services
- Leaflet for mapping capabilities

