# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)







# Restaurant Order Management System

A comprehensive system for managing restaurant orders, designed specifically for Vila Falo restaurant. The system features interfaces for waiters, kitchen staff, and managers, with real-time updates using WebSockets.

## Features

### Waiter Interface
- View all tables with status indicators
- Create new orders
- Add items to existing orders
- Mark orders as paid
- Add custom items to orders
- Add notes to order items

### Kitchen Interface
- View all active orders in real-time
- Update item status (preparing, ready, served)
- Mark orders as complete
- Prioritize orders by time

### Manager Interface
- Dashboard with daily statistics
- Menu management (add, edit, delete items)
- Table management (add, edit, delete tables)
- User management (add, edit, delete users)
- View reports (daily, custom date range)
- Export reports as CSV

### General Features
- Real-time updates with Socket.io
- Multi-language support (Albanian)
- User authentication and role-based access
- Mobile-responsive design for use on iPhones and tablets

## Technology Stack

### Frontend
- React.js with React Router for navigation
- Tailwind CSS for styling
- Socket.io-client for real-time communication
- Axios for API requests

### Backend
- Node.js with Express for the server
- MongoDB for database
- Socket.io for real-time communication
- JSON Web Tokens (JWT) for authentication
- Bcrypt for password hashing

## System Requirements

- Node.js 14.x or higher
- MongoDB 4.x or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

### 1. Clone the repository

```bash
git clone https://your-repository-url.git
cd restaurant-order-system
```

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd server

# Install dependencies
npm install

# Create a .env file
touch .env
```

Edit the `.env` file with the following contents:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/restaurant-order-system
JWT_SECRET=your_secret_key_here
```

Initialize the database with initial data:

```bash
# Seed the database with menu items
node data/menuSeed.js

# Create an admin user
node data/createAdmin.js
```

### 3. Frontend Setup

```bash
# Navigate to the frontend directory
cd ../client

# Install dependencies
npm install

# Create a .env file
touch .env
```

Edit the `.env` file with the following contents:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. Running the Application in Development Mode

#### Backend:

```bash
cd server
npm run dev
```

#### Frontend:

```bash
cd client
npm start
```

The frontend will be available at http://localhost:3000, and the backend will run on http://localhost:5000.

## Production Deployment

### 1. Backend Deployment

The backend can be deployed to platforms like Render, Railway, or Heroku:

```bash
# Build the backend
cd server
npm install

# Start the server
npm start
```

Set the following environment variables:

- `PORT`: Port for the server (default: 5000)
- `MONGO_URI`: MongoDB connection URI
- `JWT_SECRET`: Secret for JWT token generation
- `NODE_ENV`: Set to "production"

### 2. Frontend Deployment

The frontend can be deployed to platforms like Vercel or Netlify:

```bash
cd client
npm run build
```

Set the following environment variables:

- `REACT_APP_API_URL`: URL of your deployed backend API
- `REACT_APP_SOCKET_URL`: URL of your deployed WebSocket server

## Initial Login

After deployment, you can log in with the following credentials:

- **Username**: admin
- **Password**: admin123

This will give you manager access. It's recommended to change this password immediately after the first login.

## User Roles

The system has three user roles:

1. **Waiter**: Can manage orders and tables
2. **Kitchen**: Can view and update order status
3. **Manager**: Full access to all system features

## Usage Guide

### Waiter Interface

1. Log in with a waiter account
2. View table status from the dashboard
3. Select a table to view its details
4. Create a new order or add items to an existing order
5. Mark orders as paid when payment is received

### Kitchen Interface

1. Log in with a kitchen account
2. View all active orders
3. Update item status as they are prepared
4. Mark orders as complete when all items are ready

### Manager Interface

1. Log in with a manager account
2. View daily statistics on the dashboard
3. Manage menu items, tables, and users
4. View and export reports

## Software Architecture

The system follows a client-server architecture:

- **Backend**: RESTful API + WebSocket server
- **Frontend**: Single Page Application with React

### Directory Structure

```
restaurant-order-system/
├── client/                      # Frontend React application
│   ├── public/
│   └── src/
│       ├── components/          # Reusable UI components
│       ├── contexts/            # React contexts for state management
│       ├── pages/               # Main application pages
│       └── ...
├── server/                      # Backend Node.js/Express application
│   ├── config/                  # Server configuration
│   ├── controllers/             # Request handlers
│   ├── models/                  # MongoDB models
│   ├── routes/                  # API routes
│   ├── sockets/                 # Socket.io logic
│   └── ...
└── README.md                    # Project documentation
```

## Customization

### Adding Menu Items

New menu items can be added through the Manager Interface or by modifying the `server/data/menuSeed.js` file.

### Adding Tables

Tables can be added through the Manager Interface or by manually adding them to the database.

### Changing Languages

The system is currently set up for Albanian. To add more languages, you would need to:

1. Create translation files for each language
2. Add language switching functionality to the UI
3. Modify API responses to include translations

## Support

For support or questions, please contact:

- Email: support@example.com
- Phone: +123 456 789

## License

This project is licensed under the MIT License - see the LICENSE file for details.