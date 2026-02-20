import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

function HelloComponent() {
  return <div>Hello</div>;
}

describe('client package', () => {
  it('should render a component', () => {
    render(<HelloComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
