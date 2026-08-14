<script lang="ts">
  import { goto } from "$app/navigation";
  import InfoFrame from "$lib/components/info/InfoFrame.svelte";
  import { CREDIT_GROUPS, INTRO, monogram } from "$lib/credits";
</script>

<svelte:head><title>Credits - Orientation Quest</title></svelte:head>

<InfoFrame title="Credits" subtitle={INTRO} onback={() => void goto("/app/info")}>
  <div class="roll">
    {#each CREDIT_GROUPS as group (group.id)}
      <section class:past={group.past}>
        <h2>{group.title}</h2>

        <ul>
          {#each group.members as member, step (member.name)}
            <li style:--step={step}>
              <span class="badge" aria-hidden="true">{monogram(member.name)}</span>

              <div class="who">
                <h3>{member.name}</h3>
                <p class="school">{member.school}</p>

                <ul class="roles">
                  {#each member.roles as role (role)}
                    <li>{role}</li>
                  {/each}
                </ul>
              </div>

              {#if member.year}
                <span class="year">{member.year}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</InfoFrame>

<style>
  .roll {
    max-width: var(--column);
    margin-inline: auto;
    padding: calc(30 * var(--u)) calc(26 * var(--u)) var(--dock-clear);
  }

  section + section {
    margin-top: calc(34 * var(--u));
  }

  h2 {
    display: flex;
    align-items: center;
    gap: calc(12 * var(--u));
    margin: 0 0 calc(16 * var(--u));
    color: var(--primary);
    font-size: calc(15 * var(--u));
    font-weight: 700;
    letter-spacing: calc(1.4 * var(--u));
    text-transform: uppercase;
  }

  h2::after {
    content: "";
    flex: 1;
    height: calc(2 * var(--u));
    border-radius: var(--u);
    background: linear-gradient(90deg, var(--primary), transparent);
  }

  section > ul {
    display: flex;
    flex-direction: column;
    gap: calc(12 * var(--u));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  section > ul > li {
    display: flex;
    align-items: center;
    gap: calc(14 * var(--u));
    padding: calc(14 * var(--u)) calc(16 * var(--u));
    border-radius: calc(17 * var(--u));
    background: var(--highlight);
    box-shadow: 0 calc(2 * var(--u)) calc(14 * var(--u)) rgb(0 0 0 / 12%);
    animation: rise 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--step) * 45ms);
  }

  .badge {
    display: grid;
    flex: none;
    width: calc(46 * var(--u));
    height: calc(46 * var(--u));
    border-radius: 50%;
    background: linear-gradient(150deg, #ef3e56, #831421);
    box-shadow: inset 0 0 0 calc(2 * var(--u)) rgb(255 255 255 / 55%);
    color: var(--highlight);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.5 * var(--u));
    place-items: center;
  }

  .who {
    flex: 1;
    min-width: 0;
  }

  h3 {
    margin: 0;
    color: var(--secondary);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
  }

  .school {
    margin: calc(1 * var(--u)) 0 calc(7 * var(--u));
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    font-style: italic;
  }

  .roles {
    display: flex;
    flex-wrap: wrap;
    gap: calc(5 * var(--u));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .roles li {
    padding: calc(3 * var(--u)) calc(9 * var(--u));
    border-radius: calc(11 * var(--u));
    background: color-mix(in srgb, var(--primary) 11%, #ffffff);
    color: var(--primary);
    font-size: calc(11.5 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.23 * var(--u));
  }

  .year {
    flex: none;
    align-self: flex-start;
    padding: calc(3 * var(--u)) calc(8 * var(--u));
    border: var(--u) solid var(--tertiary-dark);
    border-radius: calc(9 * var(--u));
    color: var(--muted);
    font-size: calc(11 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.3 * var(--u));
  }

  .past > ul > li {
    background: #fbfafa;
    box-shadow: 0 calc(2 * var(--u)) calc(10 * var(--u)) rgb(0 0 0 / 7%);
  }

  .past h2 {
    color: var(--tertiary);
  }

  .past h2::after {
    background: linear-gradient(90deg, var(--tertiary), transparent);
  }

  .past .badge {
    background: linear-gradient(150deg, #9a9b9e, #5c5d60);
  }

  .past h3 {
    color: var(--ink-shade);
  }

  .past .roles li {
    background: var(--tertiary-normal);
    color: var(--tertiary);
  }

  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 calc(10 * var(--u));
    }

    to {
      opacity: 1;
      translate: 0 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    section > ul > li {
      animation: none;
    }
  }
</style>
