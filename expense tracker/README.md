# AI-Powered Expense Tracker

An intelligent expense tracking application with AI-powered categorization, chatbot, and insights using OpenAI's GPT API.

## Features

- **User Authentication**: Secure signup and login
- **Expense Management**: Add, view, and categorize expenses
- **AI-Powered Categorization**: Automatically suggest categories for new expenses
- **AI Chatbot**: Query your expenses using natural language
- **AI Insights**: Get personalized spending insights and suggestions
- **Admin Panel**: Administrative features for managing users and expenses
- **Visual Analytics**: Charts and graphs for spending analysis

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   - Copy `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

3. **Database**:
   - Ensure MongoDB is running on `mongodb://127.0.0.1:27017/expense-tracker`
   - Default admin credentials: `admin` / `Admin@123`

4. **Run the Application**:
   ```bash
   npm start
   # or
   node server.js
   ```

5. **Access**:
   - Main app: http://localhost:3000
   - Admin panel: http://localhost:3000/admin

## AI Features

### Expense Categorization
- When adding a new expense, enter the title and click "AI Suggest" to get category recommendations
- Categories include: Food, Transport, Entertainment, Utilities, Healthcare, Shopping, Education, Travel, Housing, Insurance, Salary, Investment, Other

### AI Chatbot
- Click "AI Chat" button on the dashboard
- Ask questions like:
  - "How much did I spend on food this month?"
  - "What's my highest expense category?"
  - "Show me expenses over ₹1000"
  - "How much did I spend last week?"

### AI Insights
- View personalized insights on your dashboard
- Get actionable suggestions for better money management
- Insights are generated based on your spending patterns

## API Routes

- `POST /ai/categorize` - Get category suggestion for expense title
- `POST /ai/chat` - Chat with expense data
- `GET /ai/insights` - Get AI-generated insights

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: EJS templates, Bootstrap 5, Chart.js
- **AI**: OpenAI GPT-3.5-turbo
- **Authentication**: bcrypt, express-session

## Security Notes

- API keys are stored in environment variables
- User sessions are managed securely
- Admin routes are protected
- All AI interactions are server-side to protect API keys

## Development

- Uses GPT-3.5-turbo for cost-effectiveness
- AI functions are modular in `utils/ai.js`
- EJS templates are updated for AI features
- Error handling for AI API failures

## License

This project is for educational purposes. Ensure compliance with OpenAI's terms of service.