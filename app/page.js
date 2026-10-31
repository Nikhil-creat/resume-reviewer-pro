import Header from './components/Header';
import Hero from './components/Hero';
import Analyzer from './components/Analyzer';
import { Features, Pipeline, SecuritySection, StackSection, Faq } from './components/Sections';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';

export default function Home() {
  return (
    <>
      <a href="#analyzer" className="skip">Skip to analyzer</a>
      <Header />
      <main>
        <Hero />
        <Analyzer />
        <Features />
        <Pipeline />
        <SecuritySection />
        <StackSection />
        <Faq />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
