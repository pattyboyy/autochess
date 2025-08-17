import React from 'react';

const StrategyGuide: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      <h1>How to Play Tower Defender</h1>

      <section>
        <h2>Introduction</h2>
        <p>Welcome to Tower Defender! This guide will teach you the fundamentals of the game, from building your first army to mastering advanced strategies. Your goal is to defeat waves of enemies and be the last player standing.</p>
      </section>

      <section>
        <h2>Core Concepts</h2>
        <p>The game revolves around a few key concepts:</p>
        <ul>
          <li>
            <strong>The Board & Placement:</strong> The game is played on a grid. During the Prep Phase, you can place units from your bench onto your side of the board. Where you place them is crucial—protect your fragile, high-damage units behind durable frontline tanks.
          </li>
          <li>
            <strong>Economy & The Shop:</strong> You earn gold automatically each round, plus bonus gold for winning or losing streaks. You can also earn interest by saving gold (1 extra gold per 10 you have, up to a maximum). Use your gold to buy units from the shop, refresh the shop for new options, or buy experience to level up faster.
          </li>
          <li>
            <strong>Upgrading Units:</strong> You can upgrade your units by combining three identical copies. For example, three 1-star Warriors will combine into a single, more powerful 2-star Warrior. Three 2-star units will combine into a final 3-star version.
          </li>
        </ul>
      </section>

      <section>
        <h2>Building Your Army</h2>
        <p>A strong army is more than just a collection of powerful units. It's about creating a team that works together.</p>
        <ul>
            <li>
                <strong>Unit Roles:</strong> Units generally fall into a few categories. <strong>Tanks</strong> (like the Warrior) are durable and meant to absorb damage on the frontline. <strong>Ranged DPS</strong> (like the Archer) deal damage from a safe distance. <strong>Casters</strong> have unique abilities that can turn the tide of battle.
            </li>
            <li>
                <strong>Synergies Explained:</strong> Every unit has traits (e.g., Vanguard, Ranger). When you have multiple units with the same trait on the board, you unlock powerful bonuses called synergies. For example, having two <strong>Vanguard</strong> units might grant them a shield at the start of combat. The more units of the same trait you have, the stronger the bonus becomes.
            </li>
            <li>
                <strong>Special Synergies:</strong> Some specific combinations of units unlock unique effects. For example, having both a Frost and a Marksman on your team might cause their attacks to ignore enemy shields. Experiment to discover these powerful duos!
            </li>
            <li>
                <strong>Items Explained:</strong> After some combat rounds, you may be rewarded with items. Drag and drop these onto your units to give them powerful stat boosts or new abilities. An item like the <strong>Berserker Axe</strong> grants raw damage, while <strong>Swift Gloves</strong> increases attack speed.
            </li>
        </ul>
      </section>

      <section>
        <h2>The Combat Phase</h2>
        <p>Once the Prep Phase timer runs out, combat begins automatically. Your units will move and attack based on their stats and programming. You can't control them directly, so your prep-phase strategy is what matters most. Watch how the fight unfolds to learn what's working and what isn't.</p>
      </section>

      <section>
        <h2>Strategy & Tactics</h2>
        <ul>
          <li><strong>Early Game (Rounds 1-10):</strong> Focus on building a solid 2-star frontline and look for early synergies. Don't be afraid to lose a little health while you build up your economy.</li>
          <li><strong>Mid Game (Rounds 11-20):</strong> This is where team composition starts to matter. Decide on a core strategy based on the units and items you've found. Start spending gold to level up and find key units.</li>
          <li><strong>Late Game (Rounds 21+):</strong> Fights are decided by powerful 3-star units and well-executed synergies. Positioning is critical—a single mistake can cost you the game. Scout your remaining opponents to counter their strategies.</li>
        </ul>
      </section>
    </div>
  );
};

export default StrategyGuide;
