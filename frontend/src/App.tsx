import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { LaptopListing, LaptopDetail, Comparison } from './pages';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<LaptopListing />} />
            <Route path="/laptop/:id" element={<LaptopDetail />} />
            <Route path="/compare" element={<Comparison />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
